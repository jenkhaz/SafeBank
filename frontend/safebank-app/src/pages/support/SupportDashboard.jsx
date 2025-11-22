import DashboardLayout from '../../components/DashboardLayout';

const SupportDashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Support Agent Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Ticket Management</h3>
            <p className="text-gray-600">Manage customer support tickets</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Customer Accounts</h3>
            <p className="text-gray-600">View customer accounts (read-only)</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SupportDashboard;
