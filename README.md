# Wings on Wheels - Where Experience Are Engineered

A comprehensive billing and management portal for Wings on Wheels car garage built with React TypeScript frontend and Node.js TypeScript backend.

## Features

### 🚗 **Billing System**
- Create bills with internal and customer views
- Support for spare parts and services
- Tax calculation and discount management
- Payment tracking and status management
- Bill printing functionality

### 👥 **User Management**
- Role-based access control (Customer, Technician, Manager)
- Different dashboards for each user type
- Customer login with mobile number
- Technician and Manager administrative access

### 📦 **Inventory Management**
- Spare parts inventory tracking
- Low stock alerts
- Category-based organization
- Stock movement tracking

### 💰 **Financial Dashboard**
- Revenue tracking (daily, weekly, monthly, yearly)
- Profit and loss statements
- Payment status monitoring
- Financial reports and analytics

### 🎯 **Role-Based Features**

#### Customer Dashboard
- View personal bills and payment history
- Track service history
- View bill details and print receipts

#### Technician Dashboard
- View assigned jobs and bills
- Track work performance
- Access to spare parts and services

#### Manager Dashboard
- Complete system overview
- Financial reports and analytics
- User management
- Inventory management
- All bills and customer management

## Tech Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** for API framework
- **PostgreSQL** with Prisma ORM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Joi** for validation

### Frontend
- **React** with TypeScript
- **React Router** for navigation
- **React Query** for data fetching
- **React Hook Form** for form management
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Lucide React** for icons

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd car-garage-portal
```

### 2. Install dependencies
```bash
npm run install:all
```

### 3. Database Setup

#### Create PostgreSQL database
```sql
CREATE DATABASE car_garage_db;
```

#### Configure environment variables
```bash
cd backend
cp env.example .env
```

Edit `.env` file with your database credentials:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/car_garage_db"
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```


#### Run database migrations
```bash
cd backend
npm run db:generate
npm run db:migrate
```

### 4. Start the application

#### Development mode (both frontend and backend)
```bash
npm run dev
```

#### Or start individually
```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Demo Accounts

For testing purposes, you can create demo accounts with the following credentials:

### Manager Account
- Phone: `1234567890`
- Password: `password123`
- Role: Manager (full access)

### Technician Account
- Phone: `0987654321`
- Password: `password123`
- Role: Technician (job management)

### Customer Account
- Phone: `1122334455`
- Password: `password123`
- Role: Customer (bill viewing)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Bills
- `GET /api/bills` - Get bills (role-based filtering)
- `POST /api/bills` - Create new bill
- `GET /api/bills/:id` - Get bill details
- `PUT /api/bills/:id` - Update bill
- `POST /api/bills/:id/payments` - Add payment
- `DELETE /api/bills/:id` - Delete bill (Manager only)

### Customers
- `GET /api/customers` - Get customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Spare Parts
- `GET /api/spare-parts` - Get spare parts
- `POST /api/spare-parts` - Create spare part
- `GET /api/spare-parts/:id` - Get spare part details
- `PUT /api/spare-parts/:id` - Update spare part
- `PATCH /api/spare-parts/:id/stock` - Update stock
- `DELETE /api/spare-parts/:id` - Delete spare part

### Services
- `GET /api/services` - Get services
- `POST /api/services` - Create service
- `GET /api/services/:id` - Get service details
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### Financial
- `GET /api/financial/reports` - Get financial reports
- `GET /api/financial/daily` - Get daily financial summary
- `GET /api/financial/profit-loss` - Get profit & loss statement

### Dashboard
- `GET /api/dashboard` - Get dashboard data (role-based)
- `GET /api/dashboard/statistics` - Get statistics for charts

## Database Schema

The application uses the following main entities:

- **Users** - System users with roles (Customer, Technician, Manager)
- **Customers** - Customer information and vehicle details
- **SpareParts** - Inventory items with stock tracking
- **Services** - Service offerings with pricing
- **Bills** - Invoices with items and payments
- **BillItems** - Individual items in bills
- **Payments** - Payment records for bills
- **FinancialReports** - Aggregated financial data

## Features in Detail

### Billing System
- Automatic bill number generation
- Support for both spare parts and services
- Tax calculation (configurable rate)
- Discount management
- Payment tracking with multiple payment methods
- Print-friendly bill format

### Inventory Management
- Real-time stock tracking
- Low stock alerts
- Category-based organization
- Supplier information
- Cost and selling price tracking
- Stock movement history

### Financial Reporting
- Daily, weekly, monthly, and yearly views
- Revenue and profit tracking
- Payment status monitoring
- Bill status analytics
- Profit and loss statements
- Interactive charts and graphs

### Role-Based Access
- **Customer**: View own bills, payment history, print receipts
- **Technician**: View assigned jobs, access parts/services, update job status
- **Manager**: Full system access, user management, financial reports

## Development

### Project Structure
```
car-garage-portal/
├── backend/                 # Node.js TypeScript backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   └── index.ts        # Main server file
│   ├── prisma/             # Database schema and migrations
│   └── package.json
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service functions
│   │   ├── contexts/       # React contexts
│   │   └── types/          # TypeScript type definitions
│   └── package.json
└── package.json            # Root package.json for scripts
```

### Adding New Features

1. **Backend**: Add new routes in `backend/src/routes/`
2. **Frontend**: Add new pages in `frontend/src/pages/`
3. **Database**: Update Prisma schema and run migrations
4. **Types**: Update TypeScript interfaces in `frontend/src/types/`

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/car_garage_db"
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Deployment

### Backend Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Deploy to your preferred platform (Heroku, AWS, etc.)

### Frontend Deployment
1. Build the application: `npm run build:frontend`
2. Deploy the `build` folder to your hosting service
3. Configure environment variables for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please create an issue in the repository.
