async function loadAnalytics() {
    try {
        const data = await apiFetch('/api/analytics');
        const { stats, monthly_collections, member_count_trend, service_breakdown } = data;

        // Update Stat Cards
        document.getElementById('stat-active').textContent = stats.total_active;
        document.getElementById('stat-earnings').textContent = '₹' + stats.this_month_collection.toLocaleString();
        document.getElementById('stat-joins').textContent = stats.new_joins_this_month;
        document.getElementById('stat-renewals').textContent = stats.renewals_this_month;

        // Revenue Chart
        new Chart(document.getElementById('revenueChart'), {
            type: 'bar',
            data: {
                labels: monthly_collections.map(d => d.month),
                datasets: [{
                    label: 'Collection (₹)',
                    data: monthly_collections.map(d => d.total),
                    backgroundColor: '#10b981'
                }]
            },
            options: { responsive: true }
        });

        // Growth Chart
        new Chart(document.getElementById('growthChart'), {
            type: 'line',
            data: {
                labels: member_count_trend.map(d => d.month),
                datasets: [{
                    label: 'New Members',
                    data: member_count_trend.map(d => d.count),
                    borderColor: '#2563eb',
                    fill: false
                }]
            },
            options: { responsive: true }
        });

        // Service Chart
        new Chart(document.getElementById('serviceChart'), {
            type: 'doughnut',
            data: {
                labels: service_breakdown.map(d => d.service),
                datasets: [{
                    data: service_breakdown.map(d => d.count),
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
            },
            options: { responsive: true }
        });

    } catch (e) {
        showToast(e.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', loadAnalytics);
