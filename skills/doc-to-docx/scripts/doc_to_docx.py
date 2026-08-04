# -*- coding: utf-8 -*-
import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import docx

IS_WINDOWS = sys.platform.startswith("win")
if IS_WINDOWS:
    try:
        import win32com.client
    except ImportError:
        win32com = None
    try:
        import pythoncom
    except ImportError:
        pythoncom = None
else:
    win32com = None
    pythoncom = None


class SofficeConverter:
    """LibreOffice 后台转换器，用于跨平台或 COM 不可用时转换 .doc / .wps 文件"""

    def __init__(self, soffice_path: str = None, timeout: int = 120):
        self.soffice_path = soffice_path or self._find_soffice()
        self.timeout = int(timeout or 120)

    @property
    def available(self) -> bool:
        return bool(self.soffice_path and os.path.exists(self.soffice_path))

    @staticmethod
    def _find_soffice() -> str | None:
        for executable in ("soffice", "soffice.com", "libreoffice"):
            found = shutil.which(executable)
            if found:
                return found

        common_paths = []
        if sys.platform == "darwin":
            common_paths.extend([
                "/Applications/LibreOffice.app/Contents/MacOS/soffice",
                "/opt/homebrew/bin/soffice",
                "/usr/local/bin/soffice",
            ])
        elif os.name == "nt":
            for base in (os.environ.get("PROGRAMFILES"), os.environ.get("PROGRAMFILES(X86)")):
                if base:
                    common_paths.extend([
                        os.path.join(base, "LibreOffice", "program", "soffice.com"),
                        os.path.join(base, "LibreOffice", "program", "soffice.exe"),
                    ])
        else:
            common_paths.extend([
                "/usr/bin/soffice",
                "/usr/local/bin/soffice",
                "/snap/bin/libreoffice",
                "/opt/libreoffice/program/soffice",
            ])

        for path in common_paths:
            if path and os.path.isfile(path):
                return path
        return None

    def convert_to_docx(self, input_path: str, target_docx_path: str) -> str:
        input_abs = os.path.abspath(input_path)
        target_abs = os.path.abspath(target_docx_path)

        if not self.available:
            raise RuntimeError(
                "LibreOffice (soffice) 不可用，无法转换 "
                f"{input_abs}。请安装 LibreOffice，或确认环境支持 Word/WPS COM 自动化。"
            )

        work_dir = tempfile.mkdtemp(prefix="doc2docx_soffice_")
        try:
            out_dir = os.path.join(work_dir, "out")
            profile_dir = os.path.join(work_dir, "profile")
            os.makedirs(out_dir, exist_ok=True)
            os.makedirs(profile_dir, exist_ok=True)

            profile_uri = os.path.abspath(profile_dir).replace("\\", "/")
            if os.name == "nt" and not profile_uri.startswith("/"):
                profile_uri = "/" + profile_uri

            cmd = [
                self.soffice_path,
                "--headless",
                "--norestore",
                f"-env:UserInstallation=file://{profile_uri}",
                "--convert-to",
                "docx",
                "--outdir",
                out_dir,
                input_abs,
            ]

            creationflags = 0
            if os.name == "nt" and hasattr(subprocess, "CREATE_NO_WINDOW"):
                creationflags = subprocess.CREATE_NO_WINDOW

            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=self.timeout,
                creationflags=creationflags,
                text=True,
                encoding="utf-8",
                errors="replace",
            )

            if result.returncode != 0:
                raise RuntimeError(f"LibreOffice 转换失败 (退出码 {result.returncode}): {result.stderr or result.stdout}")

            base_name = os.path.splitext(os.path.basename(input_abs))[0] + ".docx"
            generated_file = os.path.join(out_dir, base_name)

            if not os.path.exists(generated_file):
                docx_candidates = [f for f in os.listdir(out_dir) if f.lower().endswith(".docx")]
                if docx_candidates:
                    generated_file = os.path.join(out_dir, docx_candidates[0])
                else:
                    raise RuntimeError(f"LibreOffice 未在输出目录生成 .docx 文件: {result.stdout}")

            os.makedirs(os.path.dirname(target_abs), exist_ok=True)
            shutil.copy2(generated_file, target_abs)
            return target_abs
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)


class COMConverter:
    """Windows COM 自动化转换器（优先 WPS/Word）"""

    def __init__(self):
        self.app = None

    def _get_app(self):
        if not (IS_WINDOWS and win32com is not None):
            raise RuntimeError("当前系统或 Python 环境不支持 COM 自动化 (缺少 pywin32)")

        if self.app is None:
            app_names = ["KWPS.Application", "Word.Application", "WPS.Application"]
            last_err = None

            for app_name in app_names:
                try:
                    self.app = win32com.client.DispatchEx(app_name)
                    break
                except Exception:
                    try:
                        self.app = win32com.client.Dispatch(app_name)
                        break
                    except Exception as e:
                        last_err = e

            if self.app is None:
                raise RuntimeError(f"无法初始化 WPS 或 Word COM 组件: {last_err}")

            try:
                self.app.Visible = False
            except Exception:
                pass
            try:
                self.app.DisplayAlerts = False
            except Exception:
                pass

        return self.app

    def convert_to_docx(self, input_path: str, target_docx_path: str) -> str:
        abs_input = os.path.abspath(input_path)
        abs_target = os.path.abspath(target_docx_path)
        os.makedirs(os.path.dirname(abs_target), exist_ok=True)

        app = self._get_app()
        doc_obj = None
        try:
            doc_obj = app.Documents.Open(abs_input, ReadOnly=1)
            try:
                doc_obj.SaveAs2(abs_target, FileFormat=16)
            except Exception:
                doc_obj.SaveAs(abs_target, FileFormat=16)
            doc_obj.Close(False)
            doc_obj = None
            return abs_target
        finally:
            if doc_obj is not None:
                try:
                    doc_obj.Close(False)
                except Exception:
                    pass

    def quit(self):
        if self.app:
            try:
                self.app.Quit()
            except Exception:
                pass
            finally:
                self.app = None


def convert_file_to_docx(
    input_path: str,
    output_docx_path: str = None,
    soffice_path: str = None,
    com_converter: COMConverter = None,
) -> str:
    """将 .doc 或 .wps 文件转换为 .docx，并使用 python-docx 进行格式校验。"""
    abs_input = os.path.abspath(input_path)
    if not os.path.isfile(abs_input):
        raise FileNotFoundError(f"找不到输入文件: {abs_input}")

    ext = os.path.splitext(abs_input)[1].lower()
    if ext not in (".doc", ".wps"):
        raise ValueError(f"不受支持的文件扩展名 {ext}，仅支持 .doc 和 .wps 格式")

    if not output_docx_path:
        output_docx_path = os.path.splitext(abs_input)[0] + ".docx"
    abs_output = os.path.abspath(output_docx_path)

    conversion_err = None
    converted = False

    # 1. 尝试 COM 转换
    if IS_WINDOWS and win32com is not None:
        local_converter = com_converter or COMConverter()
        try:
            local_converter.convert_to_docx(abs_input, abs_output)
            converted = True
        except Exception as e:
            conversion_err = f"COM 转换失败 ({e})"
        finally:
            if com_converter is None:
                local_converter.quit()

    # 2. 若 COM 未能成功转换，降级尝试 LibreOffice
    if not converted:
        soffice = SofficeConverter(soffice_path=soffice_path)
        if soffice.available:
            try:
                soffice.convert_to_docx(abs_input, abs_output)
                converted = True
            except Exception as e:
                if conversion_err:
                    conversion_err += f"; LibreOffice 转换失败 ({e})"
                else:
                    conversion_err = f"LibreOffice 转换失败 ({e})"
        else:
            if not conversion_err:
                conversion_err = "当前环境不支持 COM 自动化，且未检测到可用 LibreOffice (soffice)"

    if not converted:
        raise RuntimeError(f"无法将 {abs_input} 转换为 .docx: {conversion_err}")

    # 3. 使用 python-docx 验证生成的 docx 文件
    try:
        _ = docx.Document(abs_output)
    except Exception as e:
        raise RuntimeError(f"生成的 .docx 文件格式损坏或无法由 python-docx 读取: {e}")

    return abs_output


def process_path(input_path: str, output_path: str = None, soffice_path: str = None):
    abs_input = os.path.abspath(input_path)
    supported_exts = (".doc", ".wps")

    com_converter = None
    if IS_WINDOWS and win32com is not None:
        com_converter = COMConverter()

    if pythoncom is not None:
        try:
            pythoncom.CoInitialize()
        except Exception:
            pass

    try:
        if os.path.isfile(abs_input):
            ext = os.path.splitext(abs_input)[1].lower()
            if ext not in supported_exts:
                print(f"[跳过] 不支持的格式 (仅支持 .doc/.wps): {abs_input}")
                return

            out_file = output_path
            if out_file and (os.path.isdir(out_file) or output_path.endswith(("\\", "/"))):
                out_file = os.path.join(out_file, os.path.splitext(os.path.basename(abs_input))[0] + ".docx")

            result = convert_file_to_docx(abs_input, out_file, soffice_path=soffice_path, com_converter=com_converter)
            print(f"[成功] {abs_input} -> {result}")

        elif os.path.isdir(abs_input):
            out_dir = output_path if output_path else abs_input
            os.makedirs(out_dir, exist_ok=True)

            target_files = []
            for root, _, files in os.walk(abs_input):
                for file in files:
                    if os.path.splitext(file)[1].lower() in supported_exts:
                        target_files.append(os.path.join(root, file))

            if not target_files:
                print(f"[信息] 目录中未找到 .doc 或 .wps 文件: {abs_input}")
                return

            success_count = 0
            fail_count = 0

            for src_file in target_files:
                rel_path = os.path.relpath(src_file, abs_input)
                target_docx = os.path.join(out_dir, os.path.splitext(rel_path)[0] + ".docx")
                try:
                    result = convert_file_to_docx(src_file, target_docx, soffice_path=soffice_path, com_converter=com_converter)
                    print(f"[成功] {src_file} -> {result}")
                    success_count += 1
                except Exception as e:
                    print(f"[失败] {src_file}: {e}", file=sys.stderr)
                    fail_count += 1

            print(f"\n[处理完成] 成功: {success_count} 个, 失败: {fail_count} 个。")
        else:
            raise FileNotFoundError(f"输入路径不存在: {input_path}")
    finally:
        if com_converter:
            com_converter.quit()
        if pythoncom is not None:
            try:
                pythoncom.CoUninitialize()
            except Exception:
                pass


def main():
    parser = argparse.ArgumentParser(description="将 .doc 或 .wps 格式文档无损转换为标准 .docx 格式")
    parser.add_argument("-i", "--input", required=True, help="输入 .doc / .wps 文件路径或包含它们的目录")
    parser.add_argument("-o", "--output", help="输出 .docx 文件路径或输出目录")
    parser.add_argument("--soffice", help="指定 LibreOffice (soffice) 可执行文件的完整路径 (可选)")
    args = parser.parse_args()

    try:
        process_path(args.input, args.output, soffice_path=args.soffice)
    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
