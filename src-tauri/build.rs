fn main() {
    // Zielplattform, nicht Host-Plattform: `cfg!(target_os)` waere hier die Maschine, auf der
    // build.rs laeuft, und wuerde beim Cross-Compile nach Windows faelschlich `-lgtk-layer-shell`
    // an den Linker haengen.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("linux") {
        println!("cargo:rustc-link-lib=gtk-layer-shell");
    }

    tauri_build::build()
}
