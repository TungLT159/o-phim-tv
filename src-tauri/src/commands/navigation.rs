use crate::models::NavigationState;

#[tauri::command]
pub fn get_navigation_state() -> NavigationState {
    NavigationState {
        can_go_back: false,
        can_go_forward: false,
    }
}
