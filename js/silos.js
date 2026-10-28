import { clienteSupabase } from "./config.js";
import { navegarA } from "./main.js";

export async function cargarHomeSilos() {
    const contenedor = document.getElementById("lista-silos-home");
    if (!contenedor) return;

    contenedor.innerHTML = `<p class="cargando-texto">Cargando silobolsas...</p>`;

    try {
        const { data: { user } } = await clienteSupabase.auth.getUser();
        if (!user) return;

        const { data: clienteActual } = await clienteSupabase
            .from("cliente")
            .select("id, rol, mail")
            .eq("mail", user.email.trim().toLowerCase())
            .maybeSingle();

        const esAdmin = clienteActual && clienteActual.rol === "admin";
        let silosAVisualizar = [];

        if (esAdmin) {
            const { data: todosLosSilos } = await clienteSupabase
                .from("silos_bolsa")
                .select("*, campo (nombre, ubicacion)")
                .order("id", { ascending: false });
            silosAVisualizar = todosLosSilos || [];
        } else if (clienteActual) {
            const { data: camposDelCliente } = await clienteSupabase
                .from("campo")
                .select("id")
                .eq("cliente_id", clienteActual.id);

            if (camposDelCliente && camposDelCliente.length > 0) {
                const idsCampos = camposDelCliente.map(c => c.id);
                const { data: silosCliente } = await clienteSupabase
                    .from("silos_bolsa")
                    .select("*, campo (nombre, ubicacion)")
                    .in("campo_id", idsCampos)
                    .order("id", { ascending: false });

                silosAVisualizar = silosCliente || [];
            }
        }

        if (silosAVisualizar.length === 0) {
            contenedor.innerHTML = `
                <div class="tarjeta-alerta-item">
                    <span class="material-symbols-outlined alerta-icono">info</span>
                    <div class="alerta-texto">
                        <h4>Sin silobolsas asignadas</h4>
                        <p>No se encontraron predios o silobolsas asociadas a esta cuenta.</p>
                    </div>
                </div>
            `;
            return;
        }

        contenedor.innerHTML = "";
        silosAVisualizar.forEach((silo) => {
            const tarjeta = document.createElement("div");
            tarjeta.classList.add("tarjeta-silo");
            tarjeta.onclick = () => verDetalleSilo(silo.id, silo.identificacion_silo || `Silobolsa N° ${silo.id}`);

            const nombreCampo = silo.campo 
                ? `<span class="material-symbols-outlined icono-inline">location_on</span> ${silo.campo.nombre}` 
                : '<span class="material-symbols-outlined icono-inline">location_on</span> Sin campo asignado';

            const tipoGrano = silo.tipo_grano ? `Grano: ${silo.tipo_grano.toUpperCase()}` : "Activo";

            tarjeta.innerHTML = `
                <div class="silo-info">
                    <h3><span class="material-symbols-outlined icono-inline">inventory_2</span> ${silo.identificacion_silo || 'Silobolsa N° ' + silo.id}</h3>
                    <p class="silo-campo-subtexto">${nombreCampo}</p>
                    <p class="silo-grano-estado">
                        <span class="material-symbols-outlined icono-inline ok-icon">check_circle</span> 
                        ${tipoGrano} | ${silo.capacidad_toneladas || 0} Tn
                    </p>
                </div>
                <span class="material-symbols-outlined flecha">chevron_right</span>
            `;
            contenedor.appendChild(tarjeta);
        });

    } catch (e) {
        console.error("Error al cargar silobolsas del home:", e);
        contenedor.innerHTML = "<p class='version texto-sin-datos'>Error al cargar las silobolsas.</p>";
    }
}

export async function verDetalleSilo(idSilo, identificacionSilo) {
    const elTitulo = document.getElementById("detalle-silo-titulo");
    const elCliente = document.getElementById("info-cliente-nombre");
    const elCampo = document.getElementById("info-campo-nombre");
    const elGrano = document.getElementById("info-silo-grano");
    const elFecha = document.getElementById("info-ultima-fecha");
    const elPosVara = document.getElementById("info-vara-posicion");

    if (elTitulo) elTitulo.textContent = identificacionSilo || `Silobolsa N° ${idSilo}`;
    if (elCliente) elCliente.textContent = "Buscando...";
    if (elCampo) elCampo.textContent = "Buscando...";
    if (elFecha) elFecha.textContent = "--/--/---- --:--";

    navegarA("detalle-silobolsa");

    try {
        const { data: siloData, error: errSilo } = await clienteSupabase
            .from("silos_bolsa")
            .select("*")
            .eq("id", idSilo)
            .single();

        if (errSilo || !siloData) return;

        if (elGrano) elGrano.textContent = (siloData.tipo_grano || 'Grano N/D').toUpperCase();

        let nombreCampoStr = "Campo no asignado";
        let clienteId = null;

        if (siloData.campo_id) {
            const { data: campoData } = await clienteSupabase
                .from("campo")
                .select("*")
                .eq("id", siloData.campo_id)
                .single();

            if (campoData) {
                nombreCampoStr = `${campoData.nombre} (${campoData.ubicacion || 'Sin ub.'})`;
                clienteId = campoData.cliente_id;
            }
        }
        if (elCampo) elCampo.textContent = nombreCampoStr;

        let nombreClienteStr = "Cliente no asignado";
        if (clienteId) {
            const { data: clienteData } = await clienteSupabase
                .from("cliente")
                .select("*")
                .eq("id", clienteId)
                .single();

            if (clienteData) nombreClienteStr = `${clienteData.nombre} ${clienteData.apellido}`;
        }
        if (elCliente) elCliente.textContent = nombreClienteStr;

        const { data: vara } = await clienteSupabase
            .from("varas_sensoras")
            .select("*")
            .eq("silos_id", idSilo)
            .limit(1)
            .single();

        if (!vara) {
            if (elPosVara) elPosVara.textContent = "No hay vara sensora vinculada a este silo.";
            actualizarValoresDetalle("--", "--", "--", "--", false);
            renderizarTablaMediciones([]);
            return;
        }

        if (elPosVara) elPosVara.textContent = `Vara ID: ${vara.id} | Posición: ${vara.posicion || 'Centro'}`;

        const { data: mediciones } = await clienteSupabase
            .from("mediciones")
            .select("*")
            .eq("varas_id", vara.id)
            .order("id", { ascending: false })
            .limit(10);

        if (!mediciones || mediciones.length === 0) {
            actualizarValoresDetalle("--", "--", "--", "--", false);
            renderizarTablaMediciones([]);
            return;
        }

        const ultima = mediciones[0];
        const rawFecha = ultima.fecha_hora || ultima.created_at;
        if (elFecha) elFecha.textContent = rawFecha ? new Date(rawFecha).toLocaleString('es-AR') : 'Reciente';

        actualizarValoresDetalle(
            `${ultima.temperatura_interna || '--'}°C`,
            `${ultima.humedad_interna || '--'}%`,
            `${ultima.temperatura_externa || '--'}°C`,
            `${ultima.humedad_externa || '--'}%`,
            ultima.movimiento
        );

        renderizarTablaMediciones(mediciones);

    } catch (e) {
        console.error("Error al cargar detalle del silo:", e);
    }
}

function actualizarValoresDetalle(tempInt, humInt, tempExt, humExt, hayMovimiento) {
    const campos = {
        t1: document.getElementById("val-temp-1"),
        t2: document.getElementById("val-temp-2"),
        t3: document.getElementById("val-temp-3"),
        h1: document.getElementById("val-hum-1"),
        h2: document.getElementById("val-hum-2"),
        h3: document.getElementById("val-hum-3"),
        mov: document.getElementById("val-mov-1"),
        text: document.getElementById("val-temp-ext"),
        hext: document.getElementById("val-hum-ext")
    };

    if (campos.t1) campos.t1.textContent = tempInt;
    if (campos.t2) campos.t2.textContent = tempInt;
    if (campos.t3) campos.t3.textContent = tempInt;
    if (campos.h1) campos.h1.textContent = humInt;
    if (campos.h2) campos.h2.textContent = humInt;
    if (campos.h3) campos.h3.textContent = humInt;
    if (campos.text) campos.text.textContent = tempExt;
    if (campos.hext) campos.hext.textContent = humExt;

    if (campos.mov) {
        campos.mov.innerHTML = hayMovimiento 
            ? `<span class="texto-rojo"><span class="material-symbols-outlined icono-inline icono-rojo">warning</span> ¡Movimiento Detectado!</span>`
            : `<span class="estado-ok"><span class="material-symbols-outlined icono-inline ok-icon">check_circle</span> Normal</span>`;
    }
}

function renderizarTablaMediciones(mediciones) {
    const contenedor = document.getElementById("contenedor-mediciones-dia");
    if (!contenedor) return;

    if (!mediciones || mediciones.length === 0) {
        contenedor.innerHTML = "<p class='version texto-sin-datos'>No hay mediciones registradas para este silobolsa.</p>";
        return;
    }

    let html = `
        <table class="tabla-mediciones">
            <thead>
                <tr>
                    <th>Fecha / Hora</th>
                    <th>Temp. Int.</th>
                    <th>Hum. Int.</th>
                    <th>Temp. Ext.</th>
                    <th>Acelerómetro</th>
                </tr>
            </thead>
            <tbody>
    `;

    mediciones.forEach((m) => {
        const rawFecha = m.fecha_hora || m.created_at;
        const hora = rawFecha ? new Date(rawFecha).toLocaleString('es-AR') : 'Reciente';
        const estadoMov = m.movimiento 
            ? `<span class="texto-rojo"><span class="material-symbols-outlined icono-inline icono-rojo">warning</span> Movimiento</span>` 
            : `<span class="estado-ok"><span class="material-symbols-outlined icono-inline ok-icon">check_circle</span> Normal</span>`;

        html += `
            <tr>
                <td><span class="material-symbols-outlined icono-inline">schedule</span> ${hora}</td>
                <td><strong>${m.temperatura_interna || '--'}°C</strong></td>
                <td><strong>${m.humedad_interna || '--'}%</strong></td>
                <td>${m.temperatura_externa || '--'}°C</td>
                <td>${estadoMov}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    contenedor.innerHTML = html;
}

window.verDetalleSilo = verDetalleSilo;