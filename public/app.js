document.addEventListener('DOMContentLoaded', () => {
    const urlsInput = document.getElementById('urlsInput');
    const submitBtn = document.getElementById('submitBtn');
    const logsBody = document.getElementById('logsBody');
    const totalIndexed = document.getElementById('totalIndexed');
    const avgDuration = document.getElementById('avgDuration');
    const statusMessage = document.getElementById('statusMessage');
    const saEmail = document.getElementById('saEmail');

    // Fetch service account email for instructions
    const fetchConfig = async () => {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            if (data.client_email) {
                saEmail.textContent = data.client_email;
            } else {
                saEmail.textContent = 'Email not found';
            }
        } catch (error) {
            console.error('Error fetching config:', error);
            saEmail.textContent = 'Error loading email';
        }
    };

    const fetchLogs = async () => {
        try {
            const response = await fetch('/api/logs');
            const logs = await response.json();

            logsBody.innerHTML = '';
            logs.forEach(log => {
                const row = document.createElement('tr');
                const duration = log.duration_ms ? (log.duration_ms / 1000).toFixed(2) + 's' : '-';
                const statusClass = log.status === 'SUCCESS' ? 'status-success' : 'status-failed';
                const timeStr = new Date(log.request_time).toLocaleString();

                row.innerHTML = `
                    <td><span class="status-badge ${statusClass}">${log.status}</span></td>
                    <td style="word-break: break-all;">${log.url}</td>
                    <td>${log.username || 'admin'}</td>
                    <td>${duration}</td>
                    <td>${timeStr}</td>
                `;
                logsBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error fetching logs:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            totalIndexed.textContent = stats.total_indexed || 0;
            avgDuration.textContent = stats.avg_duration ? (stats.avg_duration / 1000).toFixed(2) + 's' : '0s';
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    submitBtn.addEventListener('click', async () => {
        const rawUrls = urlsInput.value.split('\n').map(u => u.trim()).filter(u => u !== '');
        if (rawUrls.length === 0) {
            statusMessage.textContent = '❌ Please enter at least one URL';
            statusMessage.style.color = '#991b1b';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Indexing...';
        statusMessage.textContent = '⏳ Processing indexing requests...';
        statusMessage.style.color = '#2563eb';

        try {
            const response = await fetch('/api/index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: rawUrls })
            });

            const data = await response.json();
            if (data.error) {
                statusMessage.textContent = `❌ Error: ${data.error}`;
                statusMessage.style.color = '#991b1b';
            } else {
                statusMessage.textContent = '✅ Indexing requests sent! Check the logs below.';
                statusMessage.style.color = '#166534';
                urlsInput.value = '';
                fetchLogs();
                fetchStats();
            }
        } catch (error) {
            statusMessage.textContent = '❌ Network error. Is the server running?';
            statusMessage.style.color = '#991b1b';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit for Indexing';
        }
    });

    // Initial fetch
    fetchConfig();
    fetchLogs();
    fetchStats();

    // Auto refresh logs every 10 seconds
    setInterval(() => {
        fetchLogs();
        fetchStats();
    }, 10000);
});
