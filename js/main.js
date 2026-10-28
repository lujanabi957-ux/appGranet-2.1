import { verificarSesionYRol } from "./auth.js";
import { cargarHomeSilos } from "./silos.js";
import { cargarClientesAdmin, cargarCamposAdmin, cargarSilobolsasAdmin, cargarVarasAdmin, cargarEstadisticasAdmin, cargarSelectorSilobolsasSimulador } from "./admin.js";
import { cargarAlertasReales } from "./alertas.js";
import { inicializarHistorial } from "./historial.js";

document.addEventListener("DOMContentLoaded", () => {
    verificarSesionYRol();
    cargarClientesAdmin();
});

export function navegarA(idPantallaTarget) {
    const secciones = document.querySelectorAll(".pantalla-seccion");
    secciones.forEach((sec) => sec.classList.add("seccion-oculta"));

    const pantallaDestino = document.getElementById(idPantallaTarget);
    if (pantallaDestino) {
        pantallaDestino.classList.remove("seccion-oculta");
    }

    switch (idPantallaTarget) {
        case "silos":
            cargarSilobolsasAdmin();
            break;
        case "clientes":
            cargarClientesAdmin();
            break;
        case "simulacion":
            cargarSelectorSilobolsasSimulador();
            break;
        case "administrador":
            cargarEstadisticasAdmin();
            break;
        case "alertas":
            cargarAlertasReales();
            break;
        case "historial":
            inicializarHistorial();
            break;
    }

    const navItems = document.querySelectorAll(".menu-inferior .nav-item");
    navItems.forEach((item) => {
        item.classList.remove("activo");
        if (item.getAttribute("onclick") && item.getAttribute("onclick").includes(idPantallaTarget)) {
            item.classList.add("activo");
        }
    });

    window.scrollTo(0, 0);
}

window.navegarA = navegarA;