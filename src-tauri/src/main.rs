// src-tauri/src/main.rs
// Ross AI Agent — Tauri backend
// Bridges Rust system APIs to the React frontend

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;
use std::process::Command;
use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::Manager;

// ─── DATA TYPES ──────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub time: String,
    pub date: String,
    pub day: String,
    pub hostname: String,
    pub platform: String,
    pub home_dir: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CommandResult {
    pub success: bool,
    pub message: String,
}

// ─── SYSTEM COMMANDS ─────────────────────────────────────────

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let now = Local::now();
    SystemInfo {
        time: now.format("%H:%M:%S").to_string(),
        date: now.format("%B %d, %Y").to_string(),
        day: now.format("%A").to_string(),
        hostname: hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "mac".to_string()),
        platform: "macOS".to_string(),
        home_dir: dirs::home_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "~".to_string()),
    }
}

#[tauri::command]
fn list_directory(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&dir_path);
    if !path.exists() {
        return Err(format!("Directory not found: {}", dir_path));
    }

    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut result = Vec::new();

    for entry in entries.flatten() {
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') { continue; }

        result.push(FileEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: meta.len(),
            modified: "".to_string(),
        });
    }

    result.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(result)
}

#[tauri::command]
fn read_file_content(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file_content(file_path: String, content: String) -> Result<CommandResult, String> {
    fs::write(&file_path, content).map_err(|e| e.to_string())?;
    Ok(CommandResult { success: true, message: format!("Written: {}", file_path) })
}

#[tauri::command]
fn create_directory(dir_path: String) -> Result<CommandResult, String> {
    fs::create_dir_all(&dir_path).map_err(|e| e.to_string())?;
    Ok(CommandResult { success: true, message: format!("Created: {}", dir_path) })
}

#[tauri::command]
fn open_application(app_name: String) -> Result<CommandResult, String> {
    Command::new("open")
        .arg("-a")
        .arg(&app_name)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(CommandResult { success: true, message: format!("Opened {}", app_name) })
}

#[tauri::command]
fn open_file(file_path: String) -> Result<CommandResult, String> {
    Command::new("open")
        .arg(&file_path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(CommandResult { success: true, message: format!("Opened {}", file_path) })
}

#[tauri::command]
fn reveal_in_finder(file_path: String) -> Result<CommandResult, String> {
    Command::new("open")
        .arg("-R")
        .arg(&file_path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(CommandResult { success: true, message: "Revealed in Finder".to_string() })
}

#[tauri::command]
fn get_home_dir() -> String {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "~".to_string())
}

// ─── MAIN ────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            list_directory,
            read_file_content,
            write_file_content,
            create_directory,
            open_application,
            open_file,
            reveal_in_finder,
            get_home_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Ross");
}
