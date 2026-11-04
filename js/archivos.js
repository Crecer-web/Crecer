/* =================================================================
   UTILIDAD DE APERTURA SEGURA DE ARCHIVOS - PLATAFORMA CRECER
   ================================================================= */

/**
 * Convierte de forma segura cualquier archivo en Base64 o Data URL 
 * y lo abre limpiamente en una pestaña nueva, soportando imágenes y PDFs.
 */
export function abrirArchivoAdjunto(base64Data, nombreArchivo) {
    if (!base64Data) {
        console.warn("No hay datos de archivo adjunto disponibles para abrir.");
        alert("No se encontró información del archivo adjunto.");
        return;
    }

    try {
        // 1. Si es una URL web externa normal, abrir directamente
        if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
            window.open(base64Data, '_blank');
            return;
        }

        // 2. Extraer el tipo MIME y el contenido Base64
        let tipoMime = 'application/octet-stream';
        let contenidoBase64 = base64Data;

        if (base64Data.includes(',')) {
            const partes = base64Data.split(',');
            const tipoMimeMatch = partes[0].match(/:(.*?);/);
            if (tipoMimeMatch && tipoMimeMatch[1]) {
                tipoMime = tipoMimeMatch[1];
            }
            contenidoBase64 = partes[1];
        }

        // 3. Limpiar espacios o saltos de línea por seguridad
        contenidoBase64 = contenidoBase64.replace(/\s/g, '');

        // 4. Decodificación binaria robusta compatible con imágenes y PDFs pesados
        const byteCharacters = window.atob(contenidoBase64);
        const sliceSize = 512;
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        // 5. Crear el Blob con el tipo MIME exacto recuperado
        const blob = new Blob(byteArrays, { type: tipoMime });
        
        // 6. Generar URL temporal y abrir en nueva pestaña
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');

    } catch (error) {
        console.error("Error crítico al procesar el archivo adjunto:", error);
        alert("No se pudo abrir el archivo adjunto. Es posible que el archivo original se haya guardado incompleto o corrupto. Prueba volver a cargarlo.");
    }
}