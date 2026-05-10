// Prevents an extra "cmd.exe" console window from opening on Windows in release
// builds. Keep the attribute on main.rs so debug builds still log to stdout.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    aegis_empire_lib::run()
}
