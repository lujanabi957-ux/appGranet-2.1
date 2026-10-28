import { clienteSupabase } from "./config.js";
import { navegarA } from "./main.js";
import { cargarHomeSilos } from "./silos.js";
import { cargarClientesAdmin } from "./admin.js";

let modoAuth = "login";

export function cambiarModoAuth(nuevoModo) {
    modoAuth = nuevoModo;

    const tabLogin = document.getElementById("tab-login");
    const tabRegistro = document.getElementById("tab-registro");
    const titulo = document.getElementById("auth-titulo");
    const subtitulo = document.getElementById("auth-subtitulo");
    const boton = document.getElementById("btn-auth-submit");
    const campoPassword = document.getElementById("campo-password");
    const linkOlvido = document.getElementById("link-olvido");
    const textoCambio = document.getElementById("texto-cambio-modo");
    const linkVolver = document.getElementById("link-volver");

    if (nuevoModo === "login") {
        if (tabLogin) tabLogin.classList.add("active");
        if (tabRegistro) tabRegistro.classList.remove("active");
        titulo.textContent = "¡Bienvenido!";
        subtitulo.textContent = "Ingresá tus credenciales para acceder.";
        boton.textContent = "Iniciar Sesión";
        campoPassword.classList.remove("seccion-oculta");
        document.getElementById("auth-password").required = true;
        linkOlvido.classList.remove("seccion-oculta");
        textoCambio.classList.remove("seccion-oculta");
        linkVolver.classList.add("seccion-oculta");
    } else if (nuevoModo === "registro") {
        if (tabRegistro) tabRegistro.classList.add("active");
        if (tabLogin) tabLogin.classList.remove("active");
        titulo.textContent = "Crear nueva cuenta";
        subtitulo.textContent = "Registrate para comenzar a monitorear.";
        boton.textContent = "Registrarme";
        campoPassword.classList.remove("seccion-oculta");
        document.getElementById("auth-password").required = true;
        linkOlvido.classList.add("seccion-oculta");
        textoCambio.classList.add("seccion-oculta");
        linkVolver.classList.add("seccion-oculta");
    } else if (nuevoModo === "recuperar") {
        if (tabLogin) tabLogin.classList.remove("active");
        if (tabRegistro) tabRegistro.classList.remove("active");
        titulo.textContent = "Recuperar contraseña";
        subtitulo.textContent = "Ingresá tu correo y te enviaremos las instrucciones.";
        boton.textContent = "Enviar enlace de recuperación";
        campoPassword.classList.add("seccion-oculta");
        document.getElementById("auth-password").required = false;
        linkOlvido.classList.add("seccion-oculta");
        textoCambio.classList.add("seccion-oculta");
        linkVolver.classList.remove("seccion-oculta");
    }
}

const formularioAuth = document.getElementById("form-auth");
if (formularioAuth) {
    formularioAuth.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value;

        if (modoAuth === "login") {
            const { error } = await clienteSupabase.auth.signInWithPassword({ email, password });
            if (error) {
                alert("Error de autenticación: " + error.message);
                return;
            }
            await verificarSesionYRol();
        } else if (modoAuth === "registro") {
            const { data: authData, error: authError } = await clienteSupabase.auth.signUp({ email, password });
            if (authError) {
                alert("Error al registrarse: " + authError.message);
                return;
            }

            if (authData.user) {
                const nuevoCliente = {
                    nombre: email.split("@")[0],
                    apellido: "",
                    tel: "",
                    mail: email,
                    direccion: "",
                    rol: "cliente"
                };
                await clienteSupabase.from("cliente").insert([nuevoCliente]);
                alert("¡Cuenta creada exitosamente!");
                await verificarSesionYRol();
            }
        } else if (modoAuth === "recuperar") {
            const { error } = await clienteSupabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.href
            });
            if (error) {
                alert("Error: " + error.message);
                return;
            }
            alert("¡Correo de recuperación enviado!");
            cambiarModoAuth("login");
        }
    });
}

export async function verificarSesionYRol() {
    const { data: { user } } = await clienteSupabase.auth.getUser();

    const pantallaLogin = document.getElementById("login");
    const pantallaApp = document.getElementById("pantalla-app");
    const userDisplay = document.getElementById("user-email-display");
    const rolBadge = document.getElementById("user-rol-badge");

    if (!user) {
        if (pantallaLogin) pantallaLogin.classList.remove("seccion-oculta");
        if (pantallaApp) pantallaApp.classList.add("seccion-oculta");
        return;
    }

    if (pantallaLogin) pantallaLogin.classList.add("seccion-oculta");
    if (pantallaApp) pantallaApp.classList.remove("seccion-oculta");

    if (userDisplay) userDisplay.textContent = user.email;

    const { data: usuario } = await clienteSupabase
        .from("cliente")
        .select("rol")
        .eq("mail", user.email)
        .single();

    let rol = usuario ? (usuario.rol || "cliente") : "cliente";
    if (rolBadge) rolBadge.textContent = rol.toUpperCase();

    aplicarPermisosRol(rol);
    navegarA("home");
    cargarHomeSilos();
    cargarClientesAdmin();
}

function aplicarPermisosRol(rol) {
    const elementosAdmin = document.querySelectorAll(".solo-admin");
    elementosAdmin.forEach((el) => {
        if (rol === "admin") {
            el.classList.remove("seccion-oculta");
        } else {
            el.classList.add("seccion-oculta");
        }
    });
}

export async function cerrarSesion() {
    if (!confirm("¿Estás seguro de que deseas cerrar sesión?")) return;
    await clienteSupabase.auth.signOut();
    alert("Sesión cerrada correctamente.");
    window.location.reload();
}

// Exponer funciones globales que se usan en eventos onclick del HTML
window.cambiarModoAuth = cambiarModoAuth;
window.cerrarSesion = cerrarSesion;