import { clienteSupabase } from "./config.js";
import { cargarHomeSilos } from "./silos.js";

export function cambiarSubpestania(subModo) {
    const tabClientes = document.getElementById("tab-sub-clientes");
    const tabCampos = document.getElementById("tab-sub-campos");
    const vistaClientes = document.getElementById("vista-sub-clientes");
    const vistaCampos = document.getElementById("vista-sub-campos");

    if (subModo === "clientes") {
        if (tabClientes) tabClientes.classList.add("active");
        if (tabCampos) tabCampos.classList.remove("active");
        if (vistaClientes) vistaClientes.classList.remove("seccion-oculta");
        if (vistaCampos) vistaCampos.classList.add("seccion-oculta");
    } else if (subModo === "campos") {
        if (tabCampos) tabCampos.classList.add("active");
        if (tabClientes) tabClientes.classList.remove("active");
        if (vistaCampos) vistaCampos.classList.remove("seccion-oculta");
        if (vistaClientes) vistaClientes.classList.add("seccion-oculta");
        cargarSelectorClientes();
        cargarCamposAdmin();
    }
}

const formularioCliente = document.getElementById("form-clientes");
if (formularioCliente) {
    formularioCliente.addEventListener("submit", async function (e) {
        e.preventDefault();
        const nuevoCliente = {
            nombre: document.getElementById("nombre").value,
            apellido: document.getElementById("apellido").value,
            tel: document.getElementById("tel").value,
            mail: document.getElementById("mail").value,
            direccion: document.getElementById("direccion").value,
            rol: document.getElementById("rol").value
        };

        const { error } = await clienteSupabase.from("cliente").insert([nuevoCliente]);
        if (error) alert("Error: " + error.message);
        else {
            alert("Cliente guardado correctamente");
            formularioCliente.reset();
            cargarClientesAdmin();
        }
    });
}

export async function cargarClientesAdmin() {
    const contenedor = document.getElementById("contenedor-cliente");
    if (!contenedor) return;

    const { data: clientes } = await clienteSupabase.from("cliente").select("*").order("id", { ascending: false });
    if (!clientes) return;

    contenedor.innerHTML = "";
    clientes.forEach((cli) => {
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("tarjeta-cliente");
        tarjeta.innerHTML = `<strong>${cli.nombre} ${cli.apellido}</strong> (${cli.rol})<p><small>${cli.mail} | Tel: ${cli.tel}</small></p><button class="btn-eliminar" onclick="eliminarCliente(${cli.id})">Borrar</button>`;
        contenedor.appendChild(tarjeta);
    });
}

export async function eliminarCliente(id) {
    if (confirm("¿Borrar este cliente?")) {
        await clienteSupabase.from("cliente").delete().eq("id", id);
        cargarClientesAdmin();
    }
}

async function cargarSelectorClientes() {
    const selectClientes = document.getElementById("cliente-id");
    if (!selectClientes) return;

    try {
        const { data: clientes } = await clienteSupabase.from("cliente").select("id, nombre, apellido").order("nombre", { ascending: true });
        selectClientes.innerHTML = '<option value="">Seleccionar cliente...</option>';
        if (clientes) {
            clientes.forEach((cli) => {
                const opcion = document.createElement("option");
                opcion.value = cli.id;
                opcion.textContent = `${cli.nombre} ${cli.apellido}`;
                selectClientes.appendChild(opcion);
            });
        }
    } catch (e) {
        console.error("Error al cargar selector de clientes:", e);
    }
}

const formularioCampo = document.getElementById("form-campo");
if (formularioCampo) {
    formularioCampo.addEventListener("submit", async function (e) {
        e.preventDefault();
        const nuevoCampo = {
            nombre: document.getElementById("nombre-campo").value,
            ubicacion: document.getElementById("ubicacion").value,
            estado: document.getElementById("estado").value,
            cliente_id: document.getElementById("cliente-id").value
        };

        const { error } = await clienteSupabase.from("campo").insert([nuevoCampo]);
        if (error) alert("Error al guardar el campo: " + error.message);
        else {
            alert("Campo guardado correctamente.");
            formularioCampo.reset();
            cargarCamposAdmin();
        }
    });
}

export async function cargarCamposAdmin() {
    const contenedor = document.getElementById("contenedor-campos");
    if (!contenedor) return;

    try {
        const { data: campos } = await clienteSupabase.from("campo").select("*, cliente(nombre, apellido)").order("id", { ascending: false });
        if (!campos || campos.length === 0) {
            contenedor.innerHTML = "<p class='version'>No hay campos registrados.</p>";
            return;
        }

        contenedor.innerHTML = "";
        campos.forEach((cmp) => {
            const clienteNombre = cmp.cliente ? `${cmp.cliente.nombre} ${cmp.cliente.apellido}` : `Cliente ID: ${cmp.cliente_id}`;
            const tarjeta = document.createElement("div");
            tarjeta.classList.add("tarjeta-cliente");
            tarjeta.innerHTML = `<strong> ${cmp.nombre}</strong> (${cmp.estado || 'Activo'})<p><small> Ubicación: ${cmp.ubicacion} |  ${clienteNombre}</small></p><button class="btn-eliminar" onclick="eliminarCampo(${cmp.id})">Borrar Campo</button>`;
            contenedor.appendChild(tarjeta);
        });
    } catch (e) {
        console.error("Error al cargar campos:", e);
    }
}

export async function eliminarCampo(id) {
    if (confirm("¿Estás seguro de borrar este campo?")) {
        const { error } = await clienteSupabase.from("campo").delete().eq("id", id);
        if (error) alert("Error al eliminar: " + error.message);
        else cargarCamposAdmin();
    }
}

export function cambiarSubpestaniaSilos(subModo) {
    const tabSilos = document.getElementById("tab-sub-silos");
    const tabVaras = document.getElementById("tab-sub-varas");
    const vistaSilos = document.getElementById("vista-sub-silos");
    const vistaVaras = document.getElementById("vista-sub-varas");

    if (subModo === "silos") {
        if (tabSilos) tabSilos.classList.add("active");
        if (tabVaras) tabVaras.classList.remove("active");
        if (vistaSilos) vistaSilos.classList.remove("seccion-oculta");
        if (vistaVaras) vistaVaras.classList.add("seccion-oculta");
        cargarSelectorCamposSilo();
        cargarSilobolsasAdmin();
    } else if (subModo === "varas") {
        if (tabVaras) tabVaras.classList.add("active");
        if (tabSilos) tabSilos.classList.remove("active");
        if (vistaVaras) vistaVaras.classList.remove("seccion-oculta");
        if (vistaSilos) vistaSilos.classList.add("seccion-oculta");
        cargarSelectorSilobolsasVara();
        cargarVarasAdmin();
    }
}

async function cargarSelectorCamposSilo() {
    const selectCampos = document.getElementById("campo-id-silo");
    if (!selectCampos) return;

    try {
        const { data: campos } = await clienteSupabase.from("campo").select("id, nombre, ubicacion").order("nombre", { ascending: true });
        selectCampos.innerHTML = '<option value="">Seleccionar campo...</option>';
        if (campos) {
            campos.forEach((cmp) => {
                const opcion = document.createElement("option");
                opcion.value = cmp.id;
                opcion.textContent = `${cmp.nombre} (${cmp.ubicacion})`;
                selectCampos.appendChild(opcion);
            });
        }
    } catch (e) {
        console.error("Error al cargar selector de campos:", e);
    }
}

const formularioSilobolsa = document.getElementById("form-silobolsa");
if (formularioSilobolsa) {
    formularioSilobolsa.addEventListener("submit", async function (e) {
        e.preventDefault();
        const nuevoSilo = {
            identificacion_silo: document.getElementById("identificacion-sil").value.trim(),
            tipo_grano: document.getElementById("tipo-grano-silo").value,
            capacidad_toneladas: parseFloat(document.getElementById("capacidad-toneladas").value),
            fecha_instalacion: document.getElementById("fecha-instalacion-silo").value,
            estado: document.getElementById("estado-silo").value,
            campo_id: document.getElementById("campo-id-silo").value
        };

        const { error } = await clienteSupabase.from("silos_bolsa").insert([nuevoSilo]);
        if (error) alert("Error al guardar: " + error.message);
        else {
            alert("Silobolsa registrada exitosamente");
            formularioSilobolsa.reset();
            cargarSilobolsasAdmin();
            if (typeof cargarHomeSilos === "function") cargarHomeSilos();
        }
    });
}

export async function cargarSilobolsasAdmin() {
    const contenedor = document.getElementById("contenedor-silobolsas");
    if (!contenedor) return;

    try {
        const { data: silos } = await clienteSupabase.from("silos_bolsa").select("*, campo(nombre)").order("id", { ascending: false });
        if (!silos || silos.length === 0) {
            contenedor.innerHTML = "<p class='version'>No hay silobolsas registradas.</p>";
            return;
        }

        contenedor.innerHTML = "";
        silos.forEach((silo) => {
            const nombreCampo = silo.campo ? silo.campo.nombre : `Campo ID: ${silo.campo_id}`;
            const tarjeta = document.createElement("div");
            tarjeta.classList.add("tarjeta-cliente");
            tarjeta.innerHTML = `<strong>📦 ${silo.identificacion_silo || 'Silo N° ' + silo.id}</strong> (${silo.estado || 'Activo'})<p><small>🌾 Grano: ${silo.tipo_grano ? silo.tipo_grano.toUpperCase() : 'N/D'} | Capacidad: ${silo.capacidad_toneladas || 0} Tn</small></p><p><small>📍 Campo: ${nombreCampo} | Instalado: ${silo.fecha_instalacion || 'N/D'}</small></p><button class="btn-eliminar" onclick="eliminarSilobolsa(${silo.id})">Borrar Silobolsa</button>`;
            contenedor.appendChild(tarjeta);
        });
    } catch (e) {
        console.error("Error al cargar silobolsas:", e);
    }
}

export async function eliminarSilobolsa(id) {
    if (confirm("¿Estás seguro de eliminar esta silobolsa?")) {
        const { error } = await clienteSupabase.from("silos_bolsa").delete().eq("id", id);
        if (error) alert("Error: " + error.message);
        else {
            cargarSilobolsasAdmin();
            if (typeof cargarHomeSilos === "function") cargarHomeSilos();
        }
    }
}

async function cargarSelectorSilobolsasVara() {
    const selectSilos = document.getElementById("silo-id-vara");
    if (!selectSilos) return;

    try {
        const { data: silos } = await clienteSupabase.from("silos_bolsa").select("id, identificacion_silo").order("identificacion_silo", { ascending: true });
        selectSilos.innerHTML = '<option value="">Seleccionar silobolsa...</option>';
        if (silos) {
            silos.forEach((silo) => {
                const opcion = document.createElement("option");
                opcion.value = silo.id;
                opcion.textContent = silo.identificacion_silo || `Silobolsa N° ${silo.id}`;
                selectSilos.appendChild(opcion);
            });
        }
    } catch (e) {
        console.error("Error al cargar selector:", e);
    }
}

const formularioVara = document.getElementById("form-vara");
if (formularioVara) {
    formularioVara.addEventListener("submit", async function (e) {
        e.preventDefault();
        const nuevaVara = {
            silos_id: document.getElementById("silo-id-vara").value,
            posicion: document.getElementById("posicion-vara").value,
            fecha_instalacion: document.getElementById("fecha-instalacion-vara").value,
            estado_operativo: document.getElementById("estado-operativo-vara").value
        };

        const { error } = await clienteSupabase.from("varas_sensoras").insert([nuevaVara]);
        if (error) alert("Error: " + error.message);
        else {
            alert("Vara sensora asignada correctamente.");
            formularioVara.reset();
            cargarVarasAdmin();
        }
    });
}

export async function cargarVarasAdmin() {
    const contenedor = document.getElementById("contenedor-varas");
    if (!contenedor) return;

    try {
        const { data: varas } = await clienteSupabase.from("varas_sensoras").select("*, silos_bolsa(identificacion_silo)").order("id", { ascending: false });
        if (!varas || varas.length === 0) {
            contenedor.innerHTML = "<p class='version'>No hay varas sensoras registradas.</p>";
            return;
        }

        contenedor.innerHTML = "";
        varas.forEach((vara) => {
            const nombreSilo = vara.silos_bolsa ? vara.silos_bolsa.identificacion_silo : `Silo ID: ${vara.silos_id}`;
            const tarjeta = document.createElement("div");
            tarjeta.classList.add("tarjeta-cliente");
            tarjeta.innerHTML = `<strong>📡 Vara ID: ${vara.id}</strong> (${vara.estado_operativo || 'Activo'})<p><small>📦 Silo: ${nombreSilo} | 📍 Posición: ${vara.posicion || 'N/D'}</small></p><button class="btn-eliminar" onclick="eliminarVara(${vara.id})">Borrar Vara</button>`;
            contenedor.appendChild(tarjeta);
        });
    } catch (e) {
        console.error("Error al cargar varas:", e);
    }
}

export async function eliminarVara(id) {
    if (confirm("¿Estás seguro de eliminar esta vara?")) {
        const { error } = await clienteSupabase.from("varas_sensoras").delete().eq("id", id);
        if (error) alert("Error: " + error.message);
        else cargarVarasAdmin();
    }
}

export async function cargarSelectorSilobolsasSimulador() {
    const selectSimSilos = document.getElementById("sim-silo");
    if (!selectSimSilos) return;

    try {
        const { data: silos } = await clienteSupabase.from("silos_bolsa").select("id, identificacion_silo").order("identificacion_silo", { ascending: true });
        selectSimSilos.innerHTML = '<option value="">Seleccionar silobolsa...</option>';
        if (silos) {
            silos.forEach((silo) => {
                const opcion = document.createElement("option");
                opcion.value = silo.id;
                opcion.textContent = silo.identificacion_silo || `Silobolsa N° ${silo.id}`;
                selectSimSilos.appendChild(opcion);
            });
        }
    } catch (e) {
        console.error("Error al cargar simulador:", e);
    }
}

const formularioSimulacion = document.getElementById("form-simulacion");
if (formularioSimulacion) {
    formularioSimulacion.addEventListener("submit", async function (e) {
        e.preventDefault();
        const siloIdSeleccionado = document.getElementById("sim-silo").value;
        if (!siloIdSeleccionado) return;

        const { data: varaData } = await clienteSupabase.from("varas_sensoras").select("id").eq("silos_id", siloIdSeleccionado).limit(1).single();
        if (!varaData) {
            alert("Error: No se encontró una vara sensora asociada a este silobolsa.");
            return;
        }

        const nuevaMedicion = {
            temperatura_interna: parseFloat(document.getElementById("sim-temp-interna").value),
            humedad_interna: parseFloat(document.getElementById("sim-hum-interna").value),
            temperatura_externa: parseFloat(document.getElementById("sim-temp-externa").value),
            humedad_externa: parseFloat(document.getElementById("sim-hum-externa").value),
            movimiento: document.getElementById("sim-movimiento").value === "true",
            varas_id: varaData.id
        };

        const { error } = await clienteSupabase.from("mediciones").insert([nuevaMedicion]);
        if (error) alert("Error: " + error.message);
        else {
            alert("¡Datos simulados inyectados con éxito!");
            formularioSimulacion.reset();
        }
    });
}

export async function cargarEstadisticasAdmin() {
    try {
        const { count: countSilos } = await clienteSupabase.from("silos_bolsa").select("*", { count: "exact", head: true });
        const { count: countClientes } = await clienteSupabase.from("cliente").select("*", { count: "exact", head: true });
        const { count: countAlertas } = await clienteSupabase.from("alertas").select("*", { count: "exact", head: true }).eq("leida_cliente", false);

        document.getElementById("stat-total-silos").textContent = countSilos || 0;
        document.getElementById("stat-total-clientes").textContent = countClientes || 0;
        document.getElementById("stat-total-alertas").textContent = countAlertas || 0;
    } catch (e) {
        console.error("Error al cargar estadísticas:", e);
    }
}

window.cambiarSubpestania = cambiarSubpestania;
window.eliminarCliente = eliminarCliente;
window.eliminarCampo = eliminarCampo;
window.cambiarSubpestaniaSilos = cambiarSubpestaniaSilos;
window.eliminarSilobolsa = eliminarSilobolsa;
window.eliminarVara = eliminarVara;