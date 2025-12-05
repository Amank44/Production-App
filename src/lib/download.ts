export const downloadFile = (content: string | Blob, filename: string, mimeType: string = 'text/plain') => {
    // If content is string, add BOM (for CSV/Excel compatibility) and create Blob
    const blob = typeof content === 'string'
        ? new Blob(['\uFEFF' + content], { type: mimeType })
        : content;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.style.display = 'none';
    link.href = url;

    // Set filename using both property and attribute for maximum compatibility
    link.download = filename;
    link.setAttribute('download', filename);

    // Append to body is required for some browsers (like Firefox)
    document.body.appendChild(link);

    link.click();

    // Clean up
    setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }, 1000);
};
