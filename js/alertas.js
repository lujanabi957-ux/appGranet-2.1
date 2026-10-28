import { clienteSupabase } from "./config.js";

function reproducirSonidoAlerta() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        if (audioCtx.state === "suspended") audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
        console.warn("No se pudo reproducir el sonido automático de alerta:", e);
    }
}


/*
export async function cargarAlertasReales() {
    const contenedorAlertas = document.querySelector("#alertas .app-contenido");
    if (!contenedorAlertas) return;

    try {
        const { data: { user } } = await clienteSupabase.auth.getUser();
        if (!user) return;

        const { data: clienteActual } = await clienteSupabase
            .from("cliente")
            .select("id, rol, mail")
            .eq("mail", user.email.trim().toLowerCase())
            .maybeSingle();

        const esAdmin = clienteActual && clienteActual.rol === "admin";

        let query = clienteSupabase
            .from("alertas")
            .select(`
                *,
                varas_sensoras (
                    id,
                    posicion,
                    silos_bolsa (
                        identificacion_silo,
                        campo (
                            nombre,
                            cliente (nombre, apellido, tel)
                        )
                    )
                )
            `)
            .order("id", { ascending: false });

        if (!esAdmin) {
            if (!clienteActual) {
                contenedorAlertas.innerHTML = `<div class="tarjeta-alerta-item alerta-verde"><span class="material-symbols-outlined alerta-icono ok-icon">check_circle</span><div class="alerta-texto"><h4>Sin perfil asociado</h4><p>No se encontró un perfil de cliente asociado a esta cuenta.</p></div></div>`;
                return;
            }

            const { data: camposDelCliente } = await clienteSupabase.from("campo").select("id").eq("cliente_id", clienteActual.id);
            if (!camposDelCliente || camposDelCliente.length === 0) {
                contenedorAlertas.innerHTML = `<div class="tarjeta-alerta-item alerta-verde"><span class="material-symbols-outlined alerta-icono ok-icon">check_circle</span><div class="alerta-texto"><h4>¡Excelente! Todo en orden</h4><p>No hay alertas pendientes registradas.</p></div></div>`;
                return;
            }

            const idsCampos = camposDelCliente.map(c => c.id);
            const { data: silosCliente } = await clienteSupabase.from("silos_bolsa").select("id").in("campo_id", idsCampos);
            if (!silosCliente || silosCliente.length === 0) {
                contenedorAlertas.innerHTML = `<div class="tarjeta-alerta-item alerta-verde"><span class="material-symbols-outlined alerta-icono ok-icon">check_circle</span><div class="alerta-texto"><h4>¡Excelente! Todo en orden</h4><p>No hay alertas pendientes registradas.</p></div></div>`;
                return;
            }

            const idsSilos = silosCliente.map(s => s.id);
            const { data: varasCliente } = await clienteSupabase.from("varas_sensoras").select("id").in("silos_id", idsSilos);
            if (!varasCliente || varasCliente.length === 0) {
                contenedorAlertas.innerHTML = `<div class="tarjeta-alerta-item alerta-verde"><span class="material-symbols-outlined alerta-icono ok-icon">check_circle</span><div class="alerta-texto"><h4>¡Excelente! Todo en orden</h4><p>No hay alertas pendientes registradas.</p></div></div>`;
                return;
            }

            const idsVaras = varasCliente.map(v => v.id);
            query = query.in("varas_id", idsVaras);
        }

        const { data: alertas, error } = await query;

        if (error || !alertas || alertas.length === 0) {
            contenedorAlertas.innerHTML = `<div class="tarjeta-alerta-item alerta-verde"><span class="material-symbols-outlined alerta-icono ok-icon">check_circle</span><div class="alerta-texto"><h4>¡Excelente! Todo en orden</h4><p>No hay alertas pendientes registradas.</p></div></div>`;
            return;
        }

        let hayPendientesSinAtender = false;
        contenedorAlertas.innerHTML = "";

        alertas.forEach((alerta) => {
            const clienteLeio = alerta.leida_cliente;
            const adminAtendio = alerta.respuesta_admin;

            let claseColor = "alerta-roja";
            let textoEstado = " Pendiente de contacto";
            let badgeClase = "badge-rojo";

            if (clienteLeio) {
                claseColor = "alerta-verde";
                textoEstado = " Leída por Cliente";
                badgeClase = "badge-verde";
            } else if (adminAtendio) {
                claseColor = "alerta-amarilla";
                textoEstado = " Contactado / Revisado por Admin";
                badgeClase = "badge-amarillo";
            } else {
                hayPendientesSinAtender = true;
            }

            const clienteObj = alerta.varas_sensoras?.silos_bolsa?.campo?.cliente;
            const nombreCliente = clienteObj ? `${clienteObj.nombre} ${clienteObj.apellido}` : "Cliente General";
            const telCliente = clienteObj?.tel || "";
            const nombreCampo = alerta.varas_sensoras?.silos_bolsa?.campo?.nombre || "Campo N/D";
            const nombreSilo = alerta.varas_sensoras?.silos_bolsa?.identificacion_silo || "Silobolsa";
            const posicionVara = alerta.varas_sensoras?.posicion ? `(Vara: ${alerta.varas_sensoras.posicion})` : "";

            const rawFecha = alerta.fecha_hora || alerta.created_at || alerta.fecha;
            let fechaFormateada = "Reciente";
            if (rawFecha) {
                const fechaParsed = new Date(rawFecha);
                if (!isNaN(fechaParsed.getTime())) fechaFormateada = fechaParsed.toLocaleString('es-AR');
            }

            const tarjeta = document.createElement("div");
            tarjeta.className = `tarjeta-alerta-item ${claseColor}`;

            let botonesHTML = "";
            if (esAdmin) {
                let botonWhatsApp = "";
                if (telCliente) {
                    const mensajeWa = encodeURIComponent(`Hola ${nombreCliente}, te escribimos de Granet por la alerta en tu silobolsa (${nombreSilo} - ${nombreCampo}).`);
                    botonWhatsApp = `<a href="https://wa.me/549${telCliente.replace(/\D/g,'')}?text=${mensajeWa}" target="_blank" class="btn-accion-alerta btn-ws"><span class="material-symbols-outlined" style="font-size:16px;">chat</span> WhatsApp</a>`;
                }

                let botonAccionAdmin = !adminAtendio 
                    ? `<button type="button" class="btn-accion-alerta btn-contactado" onclick="marcarAtendidaAdmin(${alerta.id})"><span class="material-symbols-outlined" style="font-size:16px;">call</span> Contactado</button>`
                    : `<span class="badge-estado badge-amarillo">Revisado</span>`;

                const botonBorrar = `<button type="button" class="btn-accion-alerta btn-borrar-icon" onclick="eliminarAlerta(${alerta.id})" title="Borrar alerta"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>`;

                botonesHTML = `<div class="acciones-alerta">${botonWhatsApp}${botonAccionAdmin}${botonBorrar}</div>`;
            } else {
                if (!clienteLeio) {
                    botonesHTML = `<div class="acciones-alerta"><button type="button" class="btn-accion-alerta btn-contactado" onclick="marcarLeidaCliente(${alerta.id})"><span class="material-symbols-outlined" style="font-size:16px;">check</span> Marcar como Leída</button></div>`;
                }
            }

            const infoTel = telCliente ? ` | Tel: ${telCliente}` : "";

            tarjeta.innerHTML = `
                <span class="material-symbols-outlined alerta-icono">${clienteLeio ? 'check_circle' : 'warning'}</span>
                <div class="alerta-texto">
                    <h4>${nombreCliente} ${infoTel} | ${nombreCampo} — ${nombreSilo} ${posicionVara}</h4>
                    <p><strong>${alerta.tipo_alerta || 'Alerta'}:</strong> ${alerta.valor_registrado || 'N/D'}</p>
                    <small>${fechaFormateada} | <span class="badge-estado ${badgeClase}">${textoEstado}</span></small>
                </div>
                ${botonesHTML}
            `;
            contenedorAlertas.appendChild(tarjeta);
        });

        if (hayPendientesSinAtender) reproducirSonidoAlerta();

    } catch (e) {
        console.error("Error al cargar alertas reales:", e);
    }
}
    */


export async function cargarAlertasReales() {
    const contenedorAlertas = document.querySelector("#alertas .app-contenido");
    if (!contenedorAlertas) return;

    try {
        const { data: { user } } = await clienteSupabase.auth.getUser();
        if (!user) return;

        const { data: clienteActual } = await clienteSupabase
            .from("cliente")
            .select("id, rol, mail")
            .eq("mail", user.email.trim().toLowerCase())
            .maybeSingle();

        const esAdmin = clienteActual && clienteActual.rol === "admin";

        let query = clienteSupabase
            .from("alertas")
            .select(`
                *,
                varas_sensoras (
                    id,
                    posicion,
                    silos_bolsa (
                        identificacion_silo,
                        campo (
                            nombre,
                            cliente (nombre, apellido, tel)
                        )
                    )
                )
            `)
            .order("created_at", { ascending: false });

        if (!esAdmin) {
            if (!clienteActual) {
                contenedorAlertas.innerHTML = `<div class="tarjeta-alerta-item alerta-verde"><span class="material-symbols-outlined alerta-icono ok-icon">check_circle</span><div class="alerta-texto"><h4>Sin perfil asociado</h4><p>No se encontró un perfil de cliente asociado a esta cuenta.</p></div></div>`;
                return;
            }

            const { data: camposDelCliente } = await clienteSupabase.from("campo").select("id").eq("cliente_id", clienteActual.id);
            if (!camposDelCliente || camposDelCliente.length === 0) {
                contenedorAlertas.innerHTML = `<div class="tarjeta-alerta-item alerta-verde"><span class="material-symbols-outlined alerta-icono ok-icon">check_circle</span><div class="alerta-texto"><h4>¡Excelente! Todo en orden</h4><p>No hay alertas pendientes registradas.</p></div></div>`;
                return;
            }

            const idsCampos = camposDelCliente.map(c => c.id);
            const { data: silosCliente } = await clienteSupabase.from("silos_bolsa").select("id").in("campo_id", idsCampos);
            if (!silosCliente || silosCliente.length === 0) {
                contenedorAlertas.innerHTML = `<div class="tarjeta-alerta-item alerta-verde"><span class="material-symbols-outlined alerta-icono ok-icon">check_circle</span><div class="alerta-texto"><h4>¡Excelente! Todo en orden</h4><p>No hay alertas pendientes registradas.</p></div></div>`;
                return;
            }

            const idsSilos = silosCliente.map(s => s.id);
            const { data: varasCliente } = await clienteSupabase.from("varas_sensoras").select("id").in("silos_id", idsSilos);
            if (!varasCliente || varasCliente.length === 0) {
                contenedorAlertas.innerHTML = `<div class="tarjeta-alerta-item alerta-verde"><span class="material-symbols-outlined alerta-icono ok-icon">check_circle</span><div class="alerta-texto"><h4>¡Excelente! Todo en orden</h4><p>No hay alertas pendientes registradas.</p></div></div>`;
                return;
            }

            const idsVaras = varasCliente.map(v => v.id);
            query = query.in("varas_id", idsVaras);
        }

        const { data: alertas, error } = await query;

        if (error || !alertas || alertas.length === 0) {
            contenedorAlertas.innerHTML = `<div class="tarjeta-alerta-item alerta-verde"><span class="material-symbols-outlined alerta-icono ok-icon">check_circle</span><div class="alerta-texto"><h4>¡Excelente! Todo en orden</h4><p>No hay alertas pendientes registradas.</p></div></div>`;
            return;
        }

        let hayPendientesSinAtender = false;
        contenedorAlertas.innerHTML = "";

        alertas.forEach((alerta) => {
            const clienteLeio = alerta.leida_cliente;
            const adminAtendio = alerta.respuesta_admin;

            let claseColor = "alerta-roja";
            let textoEstado = " Pendiente de contacto";
            let badgeClase = "badge-rojo";

            if (clienteLeio) {
                claseColor = "alerta-verde";
                textoEstado = " Leída por Cliente";
                badgeClase = "badge-verde";
            } else if (adminAtendio) {
                claseColor = "alerta-amarilla";
                textoEstado = " Contactado / Revisado por Admin";
                badgeClase = "badge-amarillo";
            } else {
                hayPendientesSinAtender = true;
            }

            const clienteObj = alerta.varas_sensoras?.silos_bolsa?.campo?.cliente;
            const nombreCliente = clienteObj ? `${clienteObj.nombre} ${clienteObj.apellido}` : "Cliente General";
            const telCliente = clienteObj?.tel || "";
            const nombreCampo = alerta.varas_sensoras?.silos_bolsa?.campo?.nombre || "Campo N/D";
            const nombreSilo = alerta.varas_sensoras?.silos_bolsa?.identificacion_silo || "Silobolsa";
            const posicionVara = alerta.varas_sensoras?.posicion ? `(Vara: ${alerta.varas_sensoras.posicion})` : "";

            // --- LÍNEA MODIFICADA PARA LEER CORRECTAMENTE LA FECHA DE SUPABASE ---
            const rawFecha = alerta.created_at || alerta.fecha_hora || alerta.fecha;
            let fechaFormateada = "Reciente";
            if (rawFecha) {
                let fechaIso = rawFecha.includes("T") ? rawFecha : rawFecha.replace(" ", "T");
                if (!fechaIso.endsWith("Z") && !fechaIso.includes("+")) {
                    fechaIso += "Z";
                }
                const fechaParsed = new Date(fechaIso);
                if (!isNaN(fechaParsed.getTime())) {
                    fechaFormateada = fechaParsed.toLocaleString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    });
                }
            }
            // -------------------------------------------------------------------

            const tarjeta = document.createElement("div");
            tarjeta.className = `tarjeta-alerta-item ${claseColor}`;

            let botonesHTML = "";
            if (esAdmin) {
                let botonWhatsApp = "";
                if (telCliente) {
                    const mensajeWa = encodeURIComponent(`Hola ${nombreCliente}, te escribimos de Granet por la alerta en tu silobolsa (${nombreSilo} - ${nombreCampo}).`);
                    botonWhatsApp = `<a href="https://wa.me/549${telCliente.replace(/\D/g,'')}?text=${mensajeWa}" target="_blank" class="btn-accion-alerta btn-ws"><span class="material-symbols-outlined" style="font-size:16px;">chat</span> WhatsApp</a>`;
                }

                let botonAccionAdmin = !adminAtendio 
                    ? `<button type="button" class="btn-accion-alerta btn-contactado" onclick="marcarAtendidaAdmin(${alerta.id})"><span class="material-symbols-outlined" style="font-size:16px;">call</span> Contactado</button>`
                    : `<span class="badge-estado badge-amarillo">Revisado</span>`;

                const botonBorrar = `<button type="button" class="btn-accion-alerta btn-borrar-icon" onclick="eliminarAlerta(${alerta.id})" title="Borrar alerta"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>`;

                botonesHTML = `<div class="acciones-alerta">${botonWhatsApp}${botonAccionAdmin}${botonBorrar}</div>`;
            } else {
                if (!clienteLeio) {
                    botonesHTML = `<div class="acciones-alerta"><button type="button" class="btn-accion-alerta btn-contactado" onclick="marcarLeidaCliente(${alerta.id})"><span class="material-symbols-outlined" style="font-size:16px;">check</span> Marcar como Leída</button></div>`;
                }
            }

            const infoTel = telCliente ? ` | Tel: ${telCliente}` : "";

            tarjeta.innerHTML = `
                <span class="material-symbols-outlined alerta-icono">${clienteLeio ? 'check_circle' : 'warning'}</span>
                <div class="alerta-texto">
                    <h4>${nombreCliente} ${infoTel} | ${nombreCampo} — ${nombreSilo} ${posicionVara}</h4>
                    <p><strong>${alerta.tipo_alerta || 'Alerta'}:</strong> ${alerta.valor_registrado || 'N/D'}</p>
                    <small> ${fechaFormateada} | <span class="badge-estado ${badgeClase}">${textoEstado}</span></small>
                </div>
                ${botonesHTML}
            `;
            contenedorAlertas.appendChild(tarjeta);
        });

        if (hayPendientesSinAtender) reproducirSonidoAlerta();

    } catch (e) {
        console.error("Error al cargar alertas reales:", e);
    }
}

export async function marcarLeidaCliente(id) {
    const { error } = await clienteSupabase.from("alertas").update({ leida_cliente: true }).eq("id", id);
    if (error) alert("Error al actualizar estado: " + error.message);
    else cargarAlertasReales();
}



export async function marcarAtendidaAdmin(id) {
    const { error } = await clienteSupabase.from("alertas").update({ respuesta_admin: true }).eq("id", id);
    if (error) alert("Error al actualizar estado: " + error.message);
    else cargarAlertasReales();
}

export async function eliminarAlerta(id) {
    if (confirm("¿Estás seguro de eliminar esta alerta?")) {
        const { error } = await clienteSupabase.from("alertas").delete().eq("id", id);
        if (error) alert("Error al eliminar: " + error.message);
        else cargarAlertasReales();
    }
}

window.marcarLeidaCliente = marcarLeidaCliente;
window.marcarAtendidaAdmin = marcarAtendidaAdmin;
window.eliminarAlerta = eliminarAlerta;