# Khandelwal Cards - Project Understanding & Architecture

This document provides a comprehensive overview of the `khandelwal-cards` Angular application structure, core services, routing, and component architecture. 

## 1. Project Overview
The application is a full-featured e-commerce and point-of-sale (POS) system designed for a premium printing/cards business. It is divided into two distinct portals:
- **Admin Panel (`/admin`)**: A desktop-optimized dashboard for managing products, categories, customers, billing, and orders.
- **User/Shop Portal (`/shop`)**: A mobile-first, responsive web application for customers to browse products, manage their cart, and track their orders and ledger balance.

## 2. Core Architecture (`src/app/core/`)
The `core` directory contains the fundamental business logic, state management, and route protection mechanisms.

### Services (`core/services/`)
- **`auth.service.ts`**: Manages authentication state for both Admin and Users. Handles login, logout, and current user profile data.
- **`data.service.ts`**: The central data store/API layer of the application. It handles fetching and managing state for products, categories, orders, and customers.
- **`invoice.service.ts`**: Contains the complex business logic for generating, storing, and formatting bills, estimates, and receipts.
- **`network.service.ts`**: Monitors the application's online/offline connection status (used for offline-first capabilities and the offline overlay popup).
- **`snackbar.service.ts`**: A utility service to trigger UI toast notifications globally.

### Guards (`core/guards/`)
- **`admin.guard.ts`**: Protects `/admin` routes, ensuring only authenticated administrators can access the dashboard.
- **`user.guard.ts`**: Protects restricted `/shop` routes (like checkout, ledger, orders), ensuring the customer is logged in and verified.

## 3. Shared UI Components (`src/app/shared/`)
Reusable UI elements used across both User and Admin portals to ensure a consistent design language.
- **`bottom-sheet`**: Slide-up panels often used in the mobile UI.
- **`confirmation-modal`**: Standardized dialog boxes for destructive actions (e.g., deleting a product).
- **`image-gallery`**: A component for viewing product image carousels or zoomed images.
- **`side-drawer`**: Slide-out navigation or filtering menus.
- **`snackbar`**: The UI implementation for the `snackbar.service.ts` toast notifications.

## 4. Admin Portal (`src/app/admin/`)
The administrative backend, secured by `AdminGuard`.

- **`admin-layout`**: The shell component containing the sidebar navigation and top header. All other admin components are loaded inside its `<router-outlet>`.
- **`admin-login`**: The authentication screen for administrators.
- **`admin-dashboard`**: The landing page showing high-level analytics, pending orders, and low-stock alerts (featuring real-time SKU search).
- **`admin-categories` & `admin-products`**: CRUD interfaces for managing the product catalog.
- **`admin-customers`**: A directory of all registered users/wholesale clients.
- **`admin-orders`**: A comprehensive view of all customer orders and their fulfillment status.
- **`admin-billing`, `admin-receipts`, `admin-old-bills`**: The complete POS and financial management suite for generating new invoices, recording payments, and managing historical records. Includes offline-first capabilities.
- **`admin-settings`**: Application configuration and preferences.

## 5. User Portal (`src/app/user/`)
The customer-facing application, built with a mobile-first UI approach.

- **`user-layout`**: The shell component containing the bottom navigation bar, top header, and the global Offline Network Overlay.
- **`user-auth`**: Login and signup flows for new or existing customers.
- **`user-home`**: The main storefront landing page displaying product catalogs and categories.
- **`user-product-details`**: The detailed view for a single product, including image galleries and "Add to Cart" functionality.
- **`user-cart`**: The shopping cart and checkout preparation screen.
- **`user-orders`**: Allows customers to track their pending and historical orders.
- **`user-ledger`**: A specialized financial screen showing the customer's payment history and current outstanding balance (useful for B2B/wholesale clients).
- **`user-account`**: The customer's profile, settings, and VIP Member Card display.

## 6. Routing (`app.routes.ts`)
The application uses Angular's standalone routing system.
- The root path (`/`) automatically redirects to `/shop`.
- `/admin` routes are encapsulated as children of `AdminLayoutComponent` (except `/admin/login`).
- `/shop` routes are encapsulated as children of `UserLayoutComponent` (except `/shop/login`).
- A standalone `/presentation` route exists for displaying a `PresentationBoardComponent` (likely for TV displays or specific kiosk views).
