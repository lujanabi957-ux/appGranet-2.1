import { clienteSupabase } from "./config.js";

export async function inicializarHistorial() {
    await cargarSelectorClientesHistorial();
    
    const hoy = new Date();
    const haceSieteDias = new Date();
    haceSieteDias.setDate(hoy.getDate() - 7);

    const inputDesde = document.getElementById("filtro-desde");
    const inputHasta = document.getElementById("filtro-hasta");

    if (inputDesde) inputDesde.value = haceSieteDias.toISOString().split("T")[0];
    if (inputHasta) inputHasta.value = hoy.toISOString().split("T")[0];

    await cargarSelectorSilosHistorial();
}

async function cargarSelectorClientesHistorial() {
    const select = document.getElementById("filtro-cliente");
    if (!select) return;

    try {
        const { data: clientes } = await clienteSupabase.from("cliente").select("id, nombre, apellido").order("nombre", { ascending: true });
        select.innerHTML = '<option value="">Todos los clientes...</option>';
        if (clientes) {
            clientes.forEach((c) => {
                const opt = document.createElement("option");
                opt.value = c.id;
                opt.textContent = `${c.nombre} ${c.apellido}`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error al cargar selector de clientes en historial:", e);
    }
}

async function cargarSelectorSilosHistorial(clienteId = null) {
    const selectSilo = document.getElementById("filtro-silo");
    if (!selectSilo) return;

    try {
        const { data: silos } = await clienteSupabase.from("silos_bolsa").select("id, identificacion_silo, campo (cliente_id)");
        selectSilo.innerHTML = '<option value="">Seleccionar silobolsa...</option>';

        if (silos && silos.length > 0) {
            silos.forEach((s) => {
                if (!clienteId || (s.campo && String(s.campo.cliente_id) === String(clienteId))) {
                    const opt = document.createElement("option");
                    opt.value = s.id;
                    opt.textContent = s.identificacion_silo || `Silobolsa N° ${s.id}`;
                    selectSilo.appendChild(opt);
                }
            });
        }
    } catch (e) {
        console.error("Error al cargar selector de silos en historial:", e);
    }
}

export async function filtrarCamposPorCliente() {
    const clienteId = document.getElementById("filtro-cliente")?.value;
    await cargarSelectorSilosHistorial(clienteId);
}

export async function buscarHistorialFiltrado() {
    const siloId = document.getElementById("filtro-silo")?.value;
    const desde = document.getElementById("filtro-desde")?.value;
    const hasta = document.getElementById("filtro-hasta")?.value;
    const contenedor = document.getElementById("resultado-historial-contenedor");

    if (!contenedor) return;
    if (!siloId) {
        alert("Por favor, selecciona un silobolsa para analizar su historial.");
        return;
    }

    contenedor.innerHTML = "<p class='cargando-texto' style='text-align:center;'>Consultando histórico de mediciones...</p>";

    try {
        const { data: vara } = await clienteSupabase.from("varas_sensoras").select("id").eq("silos_id", siloId).limit(1).single();
        if (!vara) {
            contenedor.innerHTML = "<p class='version texto-sin-datos'>Este silobolsa no tiene una vara sensora vinculada.</p>";
            return;
        }

        let query = clienteSupabase.from("mediciones").select("*").eq("varas_id", vara.id).order("id", { ascending: false });
        if (desde) query = query.gte("created_at", `${desde}T00:00:00`);
        if (hasta) query = query.lte("created_at", `${hasta}T23:59:59`);

        const { data: mediciones, error } = await query;
        if (error || !mediciones || mediciones.length === 0) {
            contenedor.innerHTML = "<p class='version texto-sin-datos'>No se encontraron registros en el rango seleccionado.</p>";
            return;
        }

        const temperaturas = mediciones.map(m => m.temperatura_interna).filter(t => t !== null && !isNaN(t));
        let tempMax = "--", tempMin = "--", tempProm = "--";

        if (temperaturas.length > 0) {
            tempMax = Math.max(...temperaturas).toFixed(1);
            tempMin = Math.min(...temperaturas).toFixed(1);
            tempProm = (temperaturas.reduce((a, b) => a + b, 0) / temperaturas.length).toFixed(1);
        }

        let html = `
            <div class="grid-metricas" style="margin-bottom: 20px;">
                <div class="tarjeta-metrica"><span class="material-symbols-outlined icono-metrica">thermostat</span><div><h4>${tempProm}°C</h4><p>Temp. Promedio</p></div></div>
                <div class="tarjeta-metrica"><span class="material-symbols-outlined icono-metrica icono-rojo">arrow_upward</span><div><h4>${tempMax}°C</h4><p>Temp. Máxima</p></div></div>
                <div class="tarjeta-metrica"><span class="material-symbols-outlined icono-metrica ok-icon">arrow_downward</span><div><h4>${tempMin}°C</h4><p>Temp. Mínima</p></div></div>
            </div>
            <div class="tarjeta-form tarjeta-tabla-container">
                <table class="tabla-mediciones">
                    <thead><tr><th>Fecha y Hora</th><th>Temp. Int.</th><th>Hum. Int.</th><th>Temp. Ext.</th><th>Movimiento</th></tr></thead>
                    <tbody>
        `;

        mediciones.forEach((m) => {
            const rawFecha = m.fecha_hora || m.created_at;
            const fechaHora = rawFecha ? new Date(rawFecha).toLocaleString('es-AR') : 'Reciente';
            const estadoMov = m.movimiento ? `<span class="texto-rojo">⚠️ Detectado</span>` : `<span class="estado-ok">🟢 Normal</span>`;
            const claseTemp = m.temperatura_interna > 30 ? "texto-rojo" : "";

            html += `<tr><td>⏰ ${fechaHora}</td><td class="${claseTemp}"><strong>${m.temperatura_interna || '--'}°C</strong></td><td><strong>${m.humedad_interna || '--'}%</strong></td><td>${m.temperatura_externa || '--'}°C</td><td>${estadoMov}</td></tr>`;
        });

        html += `</tbody></table></div>`;
        contenedor.innerHTML = html;

    } catch (e) {
        console.error("Error al consultar historial:", e);
    }
}

window.filtrarCamposPorCliente = filtrarCamposPorCliente;
window.buscarHistorialFiltrado = buscarHistorialFiltrado;