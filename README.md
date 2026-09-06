# GearUp - L2B7A4

A sports and outdoor equipment rental platform where customers can rent gear, providers can manage their inventory, and admins can manage the platform.

## Overview

GearUp makes it easy to discover and rent sports and outdoor equipment.

The platform supports three main roles:

* **Customer** — Browse gear, place rental orders, make payments, track rentals, and leave reviews.
* **Provider** — Add and manage gear, manage stock, and handle rental orders.
* **Admin** — Manage users, gear listings, categories, and rental orders.

## Features

### Customer

* Register and login
* Browse sports and outdoor gear
* Search and filter gear
* View gear details
* Select rental dates
* Place rental orders
* Make payments
* View payment history
* Track rental status
* Leave reviews after returning gear
* Manage profile

### Provider

* Register and login
* Add new gear
* Update gear information
* Remove gear
* Manage inventory and stock
* View rental orders
* Update rental order status

### Admin

* Manage users
* Suspend or activate users
* Manage gear listings
* Manage rental orders
* Manage gear categories

## Payment

GearUp supports online payments through:

* Stripe
* SSLCommerz

Payment records include transaction information, amount, payment method, provider, status, and payment date.

## Rental Flow

```text
Browse Gear
    ↓
View Gear Details
    ↓
Place Rental Order
    ↓
Make Payment
    ↓
Pick Up Gear
    ↓
Return Gear
    ↓
Leave Review
```

## Rental Order Status

```text
PLACED
  │
  ├──→ CANCELLED
  │
  ↓
CONFIRMED
  │
  ↓
PAID
  │
  ↓
PICKED_UP
  │
  ↓
RETURNED
```

## Main Entities

```text
Users
  │
  ├── GearItems
  │
  ├── RentalOrders
  │       │
  │       └── Payments
  │
  └── Reviews

Categories
  │
  └── GearItems
```

### Core Tables

| Table        | Purpose                                     |
| ------------ | ------------------------------------------- |
| Users        | User information, authentication, and roles |
| GearItems    | Sports and outdoor equipment                |
| Categories   | Gear categories                             |
| RentalOrders | Rental orders and rental dates              |
| Payments     | Payment transactions                        |
| Reviews      | Customer reviews                            |

## API Modules

### Authentication

* Register
* Login
* Get current user

### Gear

* Get all gear
* Get gear details
* Search and filter gear
* Get categories

### Rental Orders

* Create rental order
* View rental orders
* View rental details
* Update rental status

### Payments

* Create payment
* Confirm payment
* View payment history
* View payment details

### Provider Management

* Manage gear inventory
* View provider orders
* Update order status

### Reviews

* Create reviews after rental completion

### Admin

* Manage users
* Manage gear
* Manage categories
* Manage rental orders

## Tech Stack

* Node.js
* Express.js
* TypeScript
* PostgreSQL
* Prisma
* JWT Authentication
* Stripe
* SSLCommerz
* REST API

## Project Structure

```text
gearup/
├── src/
├── prisma/
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/mrshanshuvo/gearup.git
cd gearup
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file and add the required database, authentication, and payment credentials.

```env
DATABASE_URL=
JWT_SECRET=

STRIPE_SECRET_KEY=

SSLCOMMERZ_STORE_ID=
SSLCOMMERZ_STORE_PASSWORD=
```

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Start the development server

```bash
npm run dev
```

## Learning Goals

This project demonstrates:

* REST API development
* Role-based access control
* JWT authentication
* Relational database design
* Inventory management
* Rental order management
* Payment integration
* PostgreSQL and Prisma
* API architecture
* Backend application development

## License

This project is licensed under the [MIT License](./LICENSE).
