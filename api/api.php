<?php
// ═══════════════════════════════════════════════════
//  SHOPCOTTO — API Handler
//  All backend actions connected to XAMPP MySQL
// ═══════════════════════════════════════════════════
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {

// ╔══════════════════════════════════════════
// ║  CUSTOMER AUTH
// ╚══════════════════════════════════════════

    case 'register': {
        $data    = getJsonInput();
        $name    = clean($conn, $data['full_name']      ?? '');
        $email   = clean($conn, $data['email']          ?? '');
        $rawPass = $data['password']                    ?? '';
        $contact = clean($conn, $data['contact_number'] ?? '');
        $fb      = clean($conn, $data['fb_name']        ?? '');

        if (!$name || !$email || !$rawPass) {
            respond(['success' => false, 'message' => 'Name, email and password are required.'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(['success' => false, 'message' => 'Invalid email address.'], 400);
        }
        if (strlen($rawPass) < 8) {
            respond(['success' => false, 'message' => 'Password must be at least 8 characters.'], 400);
        }

        $chk = $conn->query("SELECT id FROM customers WHERE email='$email' LIMIT 1");
        if ($chk && $chk->num_rows > 0) {
            respond(['success' => false, 'message' => 'Email already registered.']);
        }

        $pass = password_hash($rawPass, PASSWORD_BCRYPT);
        $sql  = "INSERT INTO customers (full_name, email, password, contact_number, fb_name)
                 VALUES ('$name','$email','$pass','$contact','$fb')";

        if ($conn->query($sql)) {
            $id = $conn->insert_id;
            $_SESSION['customer_id']    = $id;
            $_SESSION['customer_name']  = $name;
            $_SESSION['customer_email'] = $email;
            respond(['success' => true, 'message' => 'Account created!',
                     'customer' => ['id' => $id, 'name' => $name, 'email' => $email]]);
        } else {
            respond(['success' => false, 'message' => 'Registration failed: ' . $conn->error], 500);
        }
    }

    case 'login': {
        $data  = getJsonInput();
        $email = clean($conn, $data['email']    ?? '');
        $pass  = $data['password'] ?? '';

        if (!$email || !$pass) {
            respond(['success' => false, 'message' => 'Email and password are required.'], 400);
        }

        $res = $conn->query("SELECT * FROM customers WHERE email='$email' LIMIT 1");
        if (!$res || $res->num_rows === 0) {
            respond(['success' => false, 'message' => 'Account not found.']);
        }

        $user = $res->fetch_assoc();
        if (!password_verify($pass, $user['password'])) {
            respond(['success' => false, 'message' => 'Incorrect password.']);
        }

        $_SESSION['customer_id']    = $user['id'];
        $_SESSION['customer_name']  = $user['full_name'];
        $_SESSION['customer_email'] = $user['email'];

        respond(['success' => true, 'customer' => [
            'id'      => $user['id'],
            'name'    => $user['full_name'],
            'email'   => $user['email'],
            'contact' => $user['contact_number'],
            'fb'      => $user['fb_name'],
        ]]);
    }

    case 'logout': {
        session_unset();
        session_destroy();
        respond(['success' => true]);
    }

    case 'check_session': {
        if (isset($_SESSION['customer_id'])) {
            respond(['logged_in' => true, 'customer' => [
                'id'    => $_SESSION['customer_id'],
                'name'  => $_SESSION['customer_name'],
                'email' => $_SESSION['customer_email'],
            ]]);
        }
        respond(['logged_in' => false]);
    }

// ╔══════════════════════════════════════════
// ║  ADMIN AUTH
// ╚══════════════════════════════════════════

    case 'admin_login': {
        $data     = getJsonInput();
        $username = trim($data['username'] ?? '');
        $pass     = $data['password']      ?? '';

        if (!$username || !$pass) {
            respond(['success' => false, 'message' => 'Username and password required.'], 400);
        }

        // ── Hardcoded admin — always works ──────────────
        if (strtolower($username) === 'itubam' && $pass === 'mabuti') {
            $_SESSION['admin_id']       = 1;
            $_SESSION['admin_username'] = 'Itubam';
            respond(['success' => true]);
        }

        // ── Database fallback ───────────────────────────
        $u   = clean($conn, $username);
        $res = $conn->query("SELECT * FROM admins WHERE username='$u' LIMIT 1");
        if (!$res || $res->num_rows === 0) {
            respond(['success' => false, 'message' => 'Admin account not found.']);
        }

        $admin = $res->fetch_assoc();
        if (!password_verify($pass, $admin['password'])) {
            respond(['success' => false, 'message' => 'Incorrect credentials.']);
        }

        $_SESSION['admin_id']       = $admin['id'];
        $_SESSION['admin_username'] = $admin['username'];
        respond(['success' => true]);
    }

    case 'admin_logout': {
        unset($_SESSION['admin_id'], $_SESSION['admin_username']);
        respond(['success' => true]);
    }

    case 'check_admin': {
        respond(['logged_in' => isset($_SESSION['admin_id'])]);
    }

// ╔══════════════════════════════════════════
// ║  THEMES
// ╚══════════════════════════════════════════

    case 'get_themes': {
        $res = $conn->query("SELECT * FROM themes ORDER BY id ASC");
        if (!$res) respond(['success' => false, 'message' => $conn->error], 500);
        $themes = [];
        while ($row = $res->fetch_assoc()) $themes[] = $row;
        respond(['success' => true, 'themes' => $themes]);
    }

// ╔══════════════════════════════════════════
// ║  PRODUCTS
// ╚══════════════════════════════════════════

    case 'get_products': {
        $theme  = clean($conn, $_GET['theme'] ?? '');
        $search = clean($conn, $_GET['search'] ?? '');

        $sql = "SELECT p.*, t.name AS theme_name, t.slug AS theme_slug
                FROM products p
                LEFT JOIN themes t ON p.theme_id = t.id
                WHERE p.is_active = 1";

        if ($theme)  $sql .= " AND t.slug = '$theme'";
        if ($search) $sql .= " AND (p.name LIKE '%$search%' OR p.description LIKE '%$search%')";
        $sql .= " ORDER BY p.id ASC";

        $res = $conn->query($sql);
        if (!$res) respond(['success' => false, 'message' => $conn->error], 500);

        $products = [];
        while ($row = $res->fetch_assoc()) {
            $row['sizes']   = json_decode($row['sizes']   ?? '[]', true) ?: [];
            $row['colors']  = json_decode($row['colors']  ?? '[]', true) ?: [];
            $row['designs'] = json_decode($row['designs'] ?? '[]', true) ?: [];

            $pid = intval($row['id']);
            $rr  = $conn->query("SELECT AVG(rating) AS avg_r, COUNT(*) AS cnt FROM ratings WHERE product_id=$pid");
            $rd  = $rr ? $rr->fetch_assoc() : ['avg_r' => 0, 'cnt' => 0];
            $row['avg_rating']   = round((float)($rd['avg_r'] ?? 0), 1);
            $row['rating_count'] = (int)($rd['cnt'] ?? 0);

            $products[] = $row;
        }
        respond(['success' => true, 'products' => $products]);
    }

    case 'get_product': {
        $id  = intval($_GET['id'] ?? 0);
        if ($id <= 0) respond(['success' => false, 'message' => 'Invalid product ID.'], 400);

        $res = $conn->query(
            "SELECT p.*, t.name AS theme_name, t.slug AS theme_slug
             FROM products p
             LEFT JOIN themes t ON p.theme_id = t.id
             WHERE p.id = $id LIMIT 1"
        );
        if (!$res || $res->num_rows === 0) {
            respond(['success' => false, 'message' => 'Product not found.'], 404);
        }

        $row = $res->fetch_assoc();
        $row['sizes']   = json_decode($row['sizes']   ?? '[]', true) ?: [];
        $row['colors']  = json_decode($row['colors']  ?? '[]', true) ?: [];
        $row['designs'] = json_decode($row['designs'] ?? '[]', true) ?: [];

        $rr = $conn->query("SELECT AVG(rating) AS avg_r, COUNT(*) AS cnt FROM ratings WHERE product_id=$id");
        $rd = $rr ? $rr->fetch_assoc() : ['avg_r' => 0, 'cnt' => 0];
        $row['avg_rating']   = round((float)($rd['avg_r'] ?? 0), 1);
        $row['rating_count'] = (int)($rd['cnt'] ?? 0);

        $ratingRes = $conn->query(
            "SELECT r.rating, r.review, r.created_at, c.full_name
             FROM ratings r
             LEFT JOIN customers c ON r.customer_id = c.id
             WHERE r.product_id = $id
             ORDER BY r.created_at DESC LIMIT 10"
        );
        $ratings = [];
        if ($ratingRes) while ($r = $ratingRes->fetch_assoc()) $ratings[] = $r;
        $row['ratings'] = $ratings;

        respond(['success' => true, 'product' => $row]);
    }

// ╔══════════════════════════════════════════
// ║  ORDERS
// ╚══════════════════════════════════════════

    case 'place_order': {
        $data = getJsonInput();

        $customer_id = isset($_SESSION['customer_id']) ? intval($_SESSION['customer_id']) : 'NULL';
        $cname   = clean($conn, $data['customer_name']  ?? '');
        $contact = clean($conn, $data['contact_number'] ?? '');
        $fb      = clean($conn, $data['fb_name']        ?? '');
        $date    = clean($conn, $data['date_needed']    ?? '');
        $payment = clean($conn, $data['payment_method'] ?? '');
        $total   = floatval($data['total_amount']       ?? 0);
        $items   = $data['items'] ?? [];

        if (!$cname || !$contact || !$fb || !$date || !$payment) {
            respond(['success' => false, 'message' => 'Please fill in all required fields.'], 400);
        }
        if (empty($items)) {
            respond(['success' => false, 'message' => 'Cart is empty.'], 400);
        }
        if (!in_array($payment, ['cod', 'gcash'])) {
            respond(['success' => false, 'message' => 'Invalid payment method.'], 400);
        }

        $conn->begin_transaction();
        try {
            $conn->query(
                "INSERT INTO orders
                 (customer_id, customer_name, contact_number, fb_name, date_needed, payment_method, total_amount, status)
                 VALUES ($customer_id,'$cname','$contact','$fb','$date','$payment',$total,'pending')"
            );
            $order_id = $conn->insert_id;

            foreach ($items as $item) {
                $pid    = intval($item['product_id']   ?? 0);
                $pname  = clean($conn, $item['product_name'] ?? '');
                $size   = clean($conn, $item['size']         ?? '');
                $color  = clean($conn, $item['color']        ?? '');
                $design = clean($conn, $item['design']       ?? '');
                $qty    = max(1, intval($item['quantity']     ?? 1));
                $price  = floatval($item['price']             ?? 0);

                if ($pid <= 0) continue;

                $conn->query(
                    "INSERT INTO order_items
                     (order_id, product_id, product_name, size, color, design, quantity, price)
                     VALUES ($order_id,$pid,'$pname','$size','$color','$design',$qty,$price)"
                );

                $conn->query(
                    "UPDATE products SET stock = stock - $qty
                     WHERE id = $pid AND stock >= $qty"
                );
            }

            $conn->commit();
            respond(['success' => true, 'order_id' => $order_id, 'message' => 'Order placed successfully!']);

        } catch (Throwable $e) {
            $conn->rollback();
            respond(['success' => false, 'message' => 'Order failed: ' . $e->getMessage()], 500);
        }
    }

    case 'get_orders': {
        if (!isset($_SESSION['admin_id'])) {
            respond(['success' => false, 'message' => 'Unauthorized.'], 401);
        }
        $status  = clean($conn, $_GET['status']  ?? '');
        $search  = clean($conn, $_GET['search']  ?? '');
        $page    = max(1, intval($_GET['page']   ?? 1));
        $limit   = 20;
        $offset  = ($page - 1) * $limit;

        $where = "1=1";
        if ($status) $where .= " AND o.status='$status'";
        if ($search) $where .= " AND (o.customer_name LIKE '%$search%' OR o.contact_number LIKE '%$search%')";

        $countRes = $conn->query("SELECT COUNT(DISTINCT o.id) AS c FROM orders o WHERE $where");
        $total    = $countRes ? (int)$countRes->fetch_assoc()['c'] : 0;

        $sql = "SELECT o.*,
                       GROUP_CONCAT(oi.product_name ORDER BY oi.id SEPARATOR ', ') AS products
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE $where
                GROUP BY o.id
                ORDER BY o.created_at DESC
                LIMIT $limit OFFSET $offset";

        $res    = $conn->query($sql);
        $orders = [];
        if ($res) while ($row = $res->fetch_assoc()) $orders[] = $row;

        respond(['success' => true, 'orders' => $orders, 'total' => $total, 'page' => $page]);
    }

    case 'get_order_detail': {
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) respond(['success' => false, 'message' => 'Invalid order ID.'], 400);

        $sql = "SELECT * FROM orders WHERE id=$id";
        if (isset($_SESSION['customer_id'])) {
            $cid = intval($_SESSION['customer_id']);
            $sql .= " AND customer_id=$cid";
        } elseif (!isset($_SESSION['admin_id'])) {
            respond(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        $res = $conn->query($sql);
        if (!$res || $res->num_rows === 0) {
            respond(['success' => false, 'message' => 'Order not found.'], 404);
        }
        $order = $res->fetch_assoc();

        $iRes  = $conn->query(
            "SELECT oi.*, p.image_url
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = $id"
        );
        $items = [];
        if ($iRes) while ($row = $iRes->fetch_assoc()) $items[] = $row;
        $order['items'] = $items;

        respond(['success' => true, 'order' => $order]);
    }

    case 'get_my_orders': {
        if (!isset($_SESSION['customer_id'])) {
            respond(['success' => false, 'message' => 'Not logged in.'], 401);
        }
        $cid = intval($_SESSION['customer_id']);
        $res = $conn->query(
            "SELECT o.*,
                    GROUP_CONCAT(oi.product_name ORDER BY oi.id SEPARATOR ', ') AS products
             FROM orders o
             LEFT JOIN order_items oi ON o.id = oi.order_id
             WHERE o.customer_id = $cid
             GROUP BY o.id
             ORDER BY o.created_at DESC"
        );
        $orders = [];
        if ($res) while ($row = $res->fetch_assoc()) $orders[] = $row;
        respond(['success' => true, 'orders' => $orders]);
    }

    case 'update_order_status': {
        if (!isset($_SESSION['admin_id'])) {
            respond(['success' => false, 'message' => 'Unauthorized.'], 401);
        }
        $data     = getJsonInput();
        $id       = intval($data['order_id'] ?? 0);
        $status   = clean($conn, $data['status'] ?? '');
        $allowed  = ['pending','processing','completed','cancelled'];

        if ($id <= 0 || !in_array($status, $allowed)) {
            respond(['success' => false, 'message' => 'Invalid data.'], 400);
        }
        $conn->query("UPDATE orders SET status='$status' WHERE id=$id");
        respond(['success' => true, 'message' => 'Order status updated.']);
    }

// ╔══════════════════════════════════════════
// ║  RATINGS
// ╚══════════════════════════════════════════

    case 'submit_rating': {
        if (!isset($_SESSION['customer_id'])) {
            respond(['success' => false, 'message' => 'Please login to rate products.'], 401);
        }
        $data   = getJsonInput();
        $cid    = intval($_SESSION['customer_id']);
        $pid    = intval($data['product_id']    ?? 0);
        $oiid   = intval($data['order_item_id'] ?? 0);
        $rating = intval($data['rating']         ?? 0);
        $review = clean($conn, $data['review']   ?? '');

        if ($pid <= 0 || $rating < 1 || $rating > 5) {
            respond(['success' => false, 'message' => 'Invalid rating data.'], 400);
        }

        $chk = $conn->query("SELECT id FROM ratings WHERE customer_id=$cid AND product_id=$pid LIMIT 1");
        if ($chk && $chk->num_rows > 0) {
            $conn->query("UPDATE ratings SET rating=$rating, review='$review' WHERE customer_id=$cid AND product_id=$pid");
            respond(['success' => true, 'message' => 'Rating updated!']);
        }

        $conn->query(
            "INSERT INTO ratings (order_item_id, customer_id, product_id, rating, review)
             VALUES ($oiid, $cid, $pid, $rating, '$review')"
        );
        respond(['success' => true, 'message' => 'Thank you for your rating!']);
    }

// ╔══════════════════════════════════════════
// ║  STOCK & PRODUCT MANAGEMENT (Admin)
// ╚══════════════════════════════════════════

    case 'update_stock': {
        if (!isset($_SESSION['admin_id'])) {
            respond(['success' => false, 'message' => 'Unauthorized.'], 401);
        }
        $data  = getJsonInput();
        $pid   = intval($data['product_id'] ?? 0);
        $stock = max(0, intval($data['stock'] ?? 0));

        if ($pid <= 0) respond(['success' => false, 'message' => 'Invalid product ID.'], 400);

        $conn->query("UPDATE products SET stock=$stock WHERE id=$pid");
        respond(['success' => true, 'message' => "Stock updated to $stock."]);
    }

    case 'update_product': {
        if (!isset($_SESSION['admin_id'])) {
            respond(['success' => false, 'message' => 'Unauthorized.'], 401);
        }
        $data   = getJsonInput();
        $pid    = intval($data['product_id'] ?? 0);
        $price  = floatval($data['price']    ?? 0);
        $stock  = max(0, intval($data['stock']    ?? 0));
        $active = isset($data['is_active']) ? (intval($data['is_active']) ? 1 : 0) : 1;

        if ($pid <= 0 || $price <= 0) {
            respond(['success' => false, 'message' => 'Invalid product data.'], 400);
        }
        $conn->query("UPDATE products SET price=$price, stock=$stock, is_active=$active WHERE id=$pid");
        respond(['success' => true, 'message' => 'Product updated.']);
    }

    case 'add_product': {
        if (!isset($_SESSION['admin_id'])) {
            respond(['success' => false, 'message' => 'Unauthorized.'], 401);
        }
        $data     = getJsonInput();
        $theme_id = intval($data['theme_id']     ?? 0);
        $name     = clean($conn, $data['name']        ?? '');
        $desc     = clean($conn, $data['description'] ?? '');
        $price    = floatval($data['price']           ?? 0);
        $stock    = max(0, intval($data['stock']      ?? 0));
        $img      = clean($conn, $data['image_url']   ?? '');
        $sizes    = json_encode($data['sizes']    ?? []);
        $colors   = json_encode($data['colors']   ?? []);
        $designs  = json_encode($data['designs']  ?? []);

        if (!$name || $price <= 0 || $theme_id <= 0) {
            respond(['success' => false, 'message' => 'Name, price and theme are required.'], 400);
        }

        $sizes_esc   = clean($conn, $sizes);
        $colors_esc  = clean($conn, $colors);
        $designs_esc = clean($conn, $designs);

        $conn->query(
            "INSERT INTO products (theme_id, name, description, price, stock, image_url, sizes, colors, designs, is_active)
             VALUES ($theme_id,'$name','$desc',$price,$stock,'$img','$sizes_esc','$colors_esc','$designs_esc',1)"
        );
        respond(['success' => true, 'message' => 'Product added!', 'product_id' => $conn->insert_id]);
    }

    case 'toggle_product': {
        if (!isset($_SESSION['admin_id'])) {
            respond(['success' => false, 'message' => 'Unauthorized.'], 401);
        }
        $data   = getJsonInput();
        $pid    = intval($data['product_id'] ?? 0);
        $active = intval($data['is_active']  ?? 1) ? 1 : 0;
        if ($pid <= 0) respond(['success' => false, 'message' => 'Invalid ID.'], 400);
        $conn->query("UPDATE products SET is_active=$active WHERE id=$pid");
        respond(['success' => true]);
    }

// ╔══════════════════════════════════════════
// ║  DASHBOARD STATS (Admin)
// ╚══════════════════════════════════════════

    case 'get_stats': {
        if (!isset($_SESSION['admin_id'])) {
            respond(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        $q = function($sql) use ($conn) {
            $r = $conn->query($sql);
            return $r ? $r->fetch_assoc() : [];
        };

        $total_orders = (int) ($q("SELECT COUNT(*) AS c FROM orders")['c'] ?? 0);
        $pending      = (int) ($q("SELECT COUNT(*) AS c FROM orders WHERE status='pending'")['c'] ?? 0);
        $processing   = (int) ($q("SELECT COUNT(*) AS c FROM orders WHERE status='processing'")['c'] ?? 0);
        $completed    = (int) ($q("SELECT COUNT(*) AS c FROM orders WHERE status='completed'")['c'] ?? 0);
        $cancelled    = (int) ($q("SELECT COUNT(*) AS c FROM orders WHERE status='cancelled'")['c'] ?? 0);
        $revenue      = (float) ($q("SELECT COALESCE(SUM(total_amount),0) AS s FROM orders WHERE status='completed'")['s'] ?? 0);
        $customers    = (int) ($q("SELECT COUNT(*) AS c FROM customers")['c'] ?? 0);
        $products     = (int) ($q("SELECT COUNT(*) AS c FROM products WHERE is_active=1")['c'] ?? 0);
        $low_stock    = (int) ($q("SELECT COUNT(*) AS c FROM products WHERE stock<=5 AND is_active=1")['c'] ?? 0);
        $out_of_stock = (int) ($q("SELECT COUNT(*) AS c FROM products WHERE stock=0 AND is_active=1")['c'] ?? 0);

        $revenueRes = $conn->query(
            "SELECT DATE(created_at) AS day, SUM(total_amount) AS total
             FROM orders WHERE status='completed'
             AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
             GROUP BY DATE(created_at) ORDER BY day ASC"
        );
        $revenueChart = [];
        if ($revenueRes) while ($r = $revenueRes->fetch_assoc()) $revenueChart[] = $r;

        $topRes = $conn->query(
            "SELECT p.name, SUM(oi.quantity) AS sold
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             GROUP BY oi.product_id ORDER BY sold DESC LIMIT 5"
        );
        $topProducts = [];
        if ($topRes) while ($r = $topRes->fetch_assoc()) $topProducts[] = $r;

        respond(['success' => true, 'stats' => [
            'total_orders'  => $total_orders,
            'pending'       => $pending,
            'processing'    => $processing,
            'completed'     => $completed,
            'cancelled'     => $cancelled,
            'revenue'       => $revenue,
            'customers'     => $customers,
            'products'      => $products,
            'low_stock'     => $low_stock,
            'out_of_stock'  => $out_of_stock,
            'revenue_chart' => $revenueChart,
            'top_products'  => $topProducts,
        ]]);
    }

// ╔══════════════════════════════════════════
// ║  CUSTOMER MANAGEMENT (Admin)
// ╚══════════════════════════════════════════

    case 'get_customers': {
        if (!isset($_SESSION['admin_id'])) {
            respond(['success' => false, 'message' => 'Unauthorized.'], 401);
        }
        $search = clean($conn, $_GET['search'] ?? '');
        $page   = max(1, intval($_GET['page']   ?? 1));
        $limit  = 20;
        $offset = ($page - 1) * $limit;

        $where = $search ? "WHERE full_name LIKE '%$search%' OR email LIKE '%$search%'" : '';
        $countR = $conn->query("SELECT COUNT(*) AS c FROM customers $where");
        $total  = $countR ? (int)$countR->fetch_assoc()['c'] : 0;

        $res  = $conn->query(
            "SELECT id, full_name, email, contact_number, fb_name, created_at
             FROM customers $where ORDER BY created_at DESC LIMIT $limit OFFSET $offset"
        );
        $customers = [];
        if ($res) while ($row = $res->fetch_assoc()) $customers[] = $row;
        respond(['success' => true, 'customers' => $customers, 'total' => $total]);
    }

// ╔══════════════════════════════════════════
// ║  LOW STOCK LIST (Admin)
// ╚══════════════════════════════════════════

    case 'get_low_stock': {
        if (!isset($_SESSION['admin_id'])) {
            respond(['success' => false, 'message' => 'Unauthorized.'], 401);
        }
        $res = $conn->query(
            "SELECT p.id, p.name, p.stock, t.name AS theme_name
             FROM products p
             LEFT JOIN themes t ON p.theme_id = t.id
             WHERE p.is_active = 1 AND p.stock <= 5
             ORDER BY p.stock ASC"
        );
        $products = [];
        if ($res) while ($row = $res->fetch_assoc()) $products[] = $row;
        respond(['success' => true, 'products' => $products]);
    }

// ╔══════════════════════════════════════════
// ║  DEFAULT / UNKNOWN
// ╚══════════════════════════════════════════

    default:
        respond(['success' => false, 'message' => "Unknown action: '$action'"], 400);
}

$conn->close();
?>