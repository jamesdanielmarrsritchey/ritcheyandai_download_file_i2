let currentDownloadController = null;

document.getElementById('downloadForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting in the traditional way

    // Show the cancel button
    document.getElementById('cancelDownloadBtn').style.display = 'inline';

    // Initialize a new AbortController for this download
    currentDownloadController = new AbortController();
    const { signal } = currentDownloadController;

    const url = document.getElementById('fileUrl').value; // Get the URL from the input
    const fileName = document.getElementById('fileName').value; // Get the desired file name from the input

    fetch(url, { signal })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const contentLength = response.headers.get('content-length');
            if (!contentLength) {
                throw new Error('Content-Length response header is missing');
            }

            const totalBytes = parseInt(contentLength, 10);
            let receivedBytes = 0;
            const reader = response.body.getReader();
            const stream = new ReadableStream({
                start(controller) {
                    function read() {
                        reader.read().then(({done, value}) => {
                            if (done) {
                                controller.close();
                                return;
                            }
                            receivedBytes += value.length;
                            updateProgress(receivedBytes, totalBytes);
                            controller.enqueue(value);
                            read();
                        }).catch(error => {
                            console.error('Stream reading failed:', error);
                            controller.error(error);
                        });
                    }
                    read();
                }
            });

            return new Response(stream, {headers: {"Content-Type": "application/octet-stream"}}).blob();
        })
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
            if (error.name === 'AbortError') {
                console.log('Download cancelled by the user.');
            } else {
                console.error('Download failed:', error);
                alert(`Download failed: ${error.message}`);
            }
        })
        .finally(() => {
            document.getElementById('cancelDownloadBtn').style.display = 'none';
            document.getElementById('downloadProgress').value = 0; // Reset progress bar
        });
});

document.getElementById('cancelDownloadBtn').addEventListener('click', function() {
    if (currentDownloadController) {
        currentDownloadController.abort(); // Abort the fetch request
        currentDownloadController = null; // Reset the controller
        document.getElementById('downloadProgress').value = 0; // Reset progress bar
    }
});

function updateProgress(receivedBytes, totalBytes) {
    const progressElement = document.getElementById('downloadProgress');
    const percentage = (receivedBytes / totalBytes) * 100;
    progressElement.value = percentage;
}