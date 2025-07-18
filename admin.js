// Admin Panel JavaScript
let adminPanel = {
    currentSection: 'dashboard',
    isLoggedIn: false,
    realtimeInterval: null,

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadData();
    },

    checkAuth() {
        const isLoggedIn = localStorage.getItem('ashcol_admin_logged_in');
        if (isLoggedIn === 'true') {
            this.isLoggedIn = true;
            this.showAdminPanel();
        } else {
            this.isLoggedIn = false;
            this.showLoginScreen();
        }
    },

    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('adminPanel').classList.add('hidden');
    },

    showAdminPanel() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        this.loadDashboard();
        this.startRealtimeUpdates();
    },

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Service Requests Filters
        setTimeout(() => { // Wait for DOM
            const statusFilter = document.getElementById('filterStatus');
            const serviceTypeFilter = document.getElementById('filterServiceType');
            const dateFilter = document.getElementById('filterDate');
            const searchInput = document.getElementById('searchTicket');
            const refreshBtn = document.getElementById('refreshBtn');

            if (statusFilter && serviceTypeFilter && dateFilter && searchInput && refreshBtn) {
                const filterHandler = () => this.loadServiceRequests();
                statusFilter.addEventListener('change', filterHandler);
                serviceTypeFilter.addEventListener('change', filterHandler);
                dateFilter.addEventListener('change', filterHandler);
                searchInput.addEventListener('input', filterHandler);
                refreshBtn.addEventListener('click', filterHandler);
            }
        }, 500);
    },

    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (username === 'admin' && password === 'admin123') {
            localStorage.setItem('ashcol_admin_logged_in', 'true');
            this.isLoggedIn = true;
            this.showAdminPanel();
            this.showNotification('Login successful!', 'success');
        } else {
            this.showNotification('Invalid credentials. Try admin/admin123', 'error');
        }
    },

    logout() {
        localStorage.removeItem('ashcol_admin_logged_in');
        this.isLoggedIn = false;
        if (this.realtimeInterval) clearInterval(this.realtimeInterval);
        this.showLoginScreen();
        this.showNotification('Logged out successfully', 'info');
    },

    showSection(section) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        // Show the selected section
        const sectionEl = document.getElementById(section);
        if (sectionEl) sectionEl.classList.add('active');
        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        const navLink = document.querySelector(`[data-section="${section}"]`);
        if (navLink) navLink.classList.add('active');
        // Update page title
        const titles = {
            'dashboard': 'Dashboard',
            'service-requests': 'Service Requests',
            'customers': 'Customers',
            'contact-messages': 'Contact Messages',
            'reports': 'Reports',
            'settings': 'Settings'
        };
        document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';
        this.currentSection = section;
        this.loadSectionData(section);
        // Real-time update for the new section
        this.startRealtimeUpdates();
    },

    loadSectionData(section) {
        switch(section) {
            case 'dashboard': this.loadDashboard(); break;
            case 'service-requests': this.loadServiceRequests(); break;
            case 'customers': this.loadCustomers(); break;
            case 'contact-messages': this.loadContactMessages(); break;
            case 'reports': this.loadReports(); break;
        }
    },

    loadData() {
        // Add a default test ticket if none exist
        if (!localStorage.getItem('serviceTickets') || JSON.parse(localStorage.getItem('serviceTickets')).length === 0) {
            localStorage.setItem('serviceTickets', JSON.stringify([
                {
                    ticketNumber: 'ASH1001',
                    customerName: 'Test User',
                    contactNumber: '09171234567',
                    serviceType: 'installation',
                    location: 'Makati',
                    status: 'pending',
                    preferredDate: new Date().toISOString().split('T')[0],
                    timestamp: new Date().toISOString()
                }
            ]));
        }
        if (!localStorage.getItem('contactMessages')) {
            localStorage.setItem('contactMessages', JSON.stringify([]));
        }
        if (!localStorage.getItem('ashcol_customers')) {
            localStorage.setItem('ashcol_customers', JSON.stringify([]));
        }
    },

    loadDashboard() {
        const tickets = JSON.parse(localStorage.getItem('serviceTickets') || '[]');
        const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
        const customers = JSON.parse(localStorage.getItem('ashcol_customers') || '[]');

        document.getElementById('totalRequests').textContent = tickets.length;
        document.getElementById('pendingRequests').textContent = tickets.filter(t => t.status === 'pending').length;
        document.getElementById('totalCustomers').textContent = customers.length;
        document.getElementById('totalMessages').textContent = messages.length;

        this.loadRecentRequests();
    },

    loadRecentRequests() {
        const tickets = JSON.parse(localStorage.getItem('serviceTickets') || '[]');
        const recentTickets = tickets.slice(-5).reverse();

        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Ticket #</th>
                        <th>Customer</th>
                        <th>Service Type</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentTickets.map(ticket => `
                        <tr>
                            <td>${ticket.ticketNumber}</td>
                            <td>${ticket.customerName}</td>
                            <td>${ticket.serviceType}</td>
                            <td><span class="status-badge status-${ticket.status}">${ticket.status}</span></td>
                            <td>${new Date(ticket.timestamp).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-secondary" onclick="adminPanel.viewTicket('${ticket.ticketNumber}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('recentRequestsTable').innerHTML = tableHTML;
    },

    loadServiceRequests() {
        let tickets = JSON.parse(localStorage.getItem('serviceTickets') || '[]');
        const status = document.getElementById('filterStatus')?.value;
        const serviceType = document.getElementById('filterServiceType')?.value;
        const date = document.getElementById('filterDate')?.value;
        const search = document.getElementById('searchTicket')?.value?.toLowerCase();

        if (status) tickets = tickets.filter(t => t.status === status);
        if (serviceType) tickets = tickets.filter(t => t.serviceType === serviceType);
        if (date) tickets = tickets.filter(t => t.preferredDate === date);
        if (search) {
            tickets = tickets.filter(t =>
                t.ticketNumber.toLowerCase().includes(search) ||
                t.customerName.toLowerCase().includes(search)
            );
        }
        this.renderServiceRequestsTable(tickets);
    },

    renderServiceRequestsTable(tickets) {
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Ticket #</th>
                        <th>Customer</th>
                        <th>Contact</th>
                        <th>Service Type</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tickets.map(ticket => `
                        <tr>
                            <td>${ticket.ticketNumber}</td>
                            <td>${ticket.customerName}</td>
                            <td>${ticket.contactNumber}</td>
                            <td>${ticket.serviceType}</td>
                            <td>${ticket.branch || ''}</td>
                            <td>
                                <select onchange="adminPanel.updateTicketStatus('${ticket.ticketNumber}', this.value)" class="status-badge status-${ticket.status}">
                                    <option value="pending" ${ticket.status === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="in-progress" ${ticket.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                    <option value="completed" ${ticket.status === 'completed' ? 'selected' : ''}>Completed</option>
                                    <option value="cancelled" ${ticket.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </td>
                            <td>${new Date(ticket.timestamp).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-secondary" onclick="adminPanel.viewTicket('${ticket.ticketNumber}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-danger" onclick="adminPanel.deleteTicket('${ticket.ticketNumber}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('serviceRequestsTable').innerHTML = tableHTML;
    },

    loadCustomers() {
        const tickets = JSON.parse(localStorage.getItem('serviceTickets') || '[]');
        const customerMap = new Map();
        
        tickets.forEach(ticket => {
            if (!customerMap.has(ticket.customerName)) {
                customerMap.set(ticket.customerName, {
                    name: ticket.customerName,
                    contact: ticket.contactNumber,
                    firstRequest: ticket.timestamp,
                    totalRequests: 1
                });
            } else {
                const customer = customerMap.get(ticket.customerName);
                customer.totalRequests++;
                // Update firstRequest if this ticket is earlier
                if (new Date(ticket.timestamp) < new Date(customer.firstRequest)) {
                    customer.firstRequest = ticket.timestamp;
                }
            }
        });

        const customersList = Array.from(customerMap.values());

        let tableHTML = '';
        if (customersList.length === 0) {
            tableHTML = '<p style="padding:2rem;text-align:center;color:#888;">No customers found.</p>';
        } else {
            tableHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Contact Number</th>
                            <th>Total Requests</th>
                            <th>First Request</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customersList.map(customer => `
                            <tr>
                                <td>${customer.name}</td>
                                <td>${customer.contact}</td>
                                <td>${customer.totalRequests}</td>
                                <td>${new Date(customer.firstRequest).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-secondary" onclick="adminPanel.viewCustomerHistory('${customer.name}')">
                                        <i class="fas fa-history"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        document.getElementById('customersTable').innerHTML = tableHTML;
    },

    loadContactMessages() {
        const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');

        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Service</th>
                        <th>Message</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${messages.map(message => `
                        <tr>
                            <td>${message.name}</td>
                            <td>${message.email}</td>
                            <td>${message.phone}</td>
                            <td>${message.service}</td>
                            <td>${message.message.substring(0, 50)}${message.message.length > 50 ? '...' : ''}</td>
                            <td>${new Date(message.timestamp).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-secondary" onclick="adminPanel.viewMessage('${message.id}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-danger" onclick="adminPanel.deleteMessage('${message.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('contactMessagesTable').innerHTML = tableHTML;
    },

    loadReports() {
        const tickets = JSON.parse(localStorage.getItem('serviceTickets') || '[]');
        
        // Simple charts
        const monthlyData = this.getMonthlyData(tickets);
        document.getElementById('monthlyChart').innerHTML = this.createMonthlyChart(monthlyData);
        
        const serviceData = this.getServiceTypeData(tickets);
        document.getElementById('serviceTypeChart').innerHTML = this.createServiceTypeChart(serviceData);
    },

    getMonthlyData(tickets) {
        const months = {};
        tickets.forEach(ticket => {
            const month = new Date(ticket.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            months[month] = (months[month] || 0) + 1;
        });
        return months;
    },

    getServiceTypeData(tickets) {
        const services = {};
        tickets.forEach(ticket => {
            services[ticket.serviceType] = (services[ticket.serviceType] || 0) + 1;
        });
        return services;
    },

    createMonthlyChart(data) {
        const labels = Object.keys(data);
        const values = Object.values(data);
        
        return `
            <div style="height: 200px; display: flex; align-items: end; justify-content: space-around; margin-top: 1rem;">
                ${values.map((value, index) => `
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="width: 30px; background: #39B54A; height: ${(value / Math.max(...values)) * 150}px; border-radius: 4px;"></div>
                        <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #666;">${labels[index]}</div>
                        <div style="font-size: 0.8rem; font-weight: 600;">${value}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    createServiceTypeChart(data) {
        const total = Object.values(data).reduce((sum, val) => sum + val, 0);
        
        return `
            <div style="margin-top: 1rem;">
                ${Object.entries(data).map(([service, count]) => {
                    const percentage = ((count / total) * 100).toFixed(1);
                    return `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span>${service}</span>
                            <span>${count} (${percentage}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; margin-bottom: 1rem;">
                            <div style="width: ${percentage}%; height: 100%; background: #39B54A; border-radius: 4px;"></div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    updateTicketStatus(ticketNumber, newStatus) {
        const tickets = JSON.parse(localStorage.getItem('serviceTickets') || '[]');
        const ticketIndex = tickets.findIndex(t => t.ticketNumber === ticketNumber);
        
        if (ticketIndex !== -1) {
            tickets[ticketIndex].status = newStatus;
            localStorage.setItem('serviceTickets', JSON.stringify(tickets));
            this.showNotification(`Ticket ${ticketNumber} status updated to ${newStatus}`, 'success');
            this.loadDashboard();
        }
    },

    viewTicket(ticketNumber) {
        const tickets = JSON.parse(localStorage.getItem('serviceTickets') || '[]');
        const ticket = tickets.find(t => t.ticketNumber === ticketNumber);
        
        if (ticket) {
            const details = `
Ticket Number: ${ticket.ticketNumber}
Customer: ${ticket.customerName}
Contact: ${ticket.contactNumber}
Service Type: ${ticket.serviceType}
Location: ${ticket.location}
Status: ${ticket.status}
Date: ${new Date(ticket.timestamp).toLocaleString()}
Description: ${ticket.description || 'No description provided'}
            `;
            alert(details);
        }
    },

    viewMessage(messageId) {
        const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
        const message = messages.find(m => m.id == messageId);
        
        if (message) {
            const details = `
Name: ${message.name}
Email: ${message.email}
Phone: ${message.phone}
Service: ${message.service}
Date: ${new Date(message.timestamp).toLocaleString()}
Message: ${message.message}
            `;
            alert(details);
        }
    },

    viewCustomerHistory(customerName) {
        const tickets = JSON.parse(localStorage.getItem('serviceTickets') || '[]');
        const customerTickets = tickets.filter(t => t.customerName === customerName);
        
        if (customerTickets.length > 0) {
            const history = customerTickets.map(ticket => `
Ticket: ${ticket.ticketNumber}
Service: ${ticket.serviceType}
Status: ${ticket.status}
Date: ${new Date(ticket.timestamp).toLocaleDateString()}
            `).join('\n\n');
            
            alert(`Service History for ${customerName}:\n\n${history}`);
        } else {
            alert(`No service history found for ${customerName}`);
        }
    },

    deleteTicket(ticketNumber) {
        if (confirm(`Are you sure you want to delete ticket ${ticketNumber}?`)) {
            const tickets = JSON.parse(localStorage.getItem('serviceTickets') || '[]');
            const filteredTickets = tickets.filter(t => t.ticketNumber !== ticketNumber);
            localStorage.setItem('serviceTickets', JSON.stringify(filteredTickets));
            this.showNotification(`Ticket ${ticketNumber} deleted successfully`, 'success');
            this.loadServiceRequests();
            this.loadDashboard();
        }
    },

    deleteMessage(messageId) {
        if (confirm('Are you sure you want to delete this message?')) {
            const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
            const filteredMessages = messages.filter(m => m.id != messageId);
            localStorage.setItem('contactMessages', JSON.stringify(filteredMessages));
            this.showNotification('Message deleted successfully', 'success');
            this.loadContactMessages();
            this.loadDashboard();
        }
    },

    showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="notification-close">&times;</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#39B54A' : type === 'error' ? '#dc3545' : '#007bff'};
            color: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .notification-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                margin-left: 1rem;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    },

    // --- Real-time updates for Service Requests and Customers ---
    startRealtimeUpdates() {
        if (this.realtimeInterval) clearInterval(this.realtimeInterval);
        this.realtimeInterval = setInterval(() => {
            if (this.currentSection === 'service-requests') {
                this.loadServiceRequests();
            } else if (this.currentSection === 'customers') {
                this.loadCustomers();
            }
        }, 2000); // Update every 2 seconds
    }
};

// Global functions
function logout() {
    adminPanel.logout();
}

function showSection(section) {
    adminPanel.showSection(section);
}

// Initialize admin panel
adminPanel.init();
