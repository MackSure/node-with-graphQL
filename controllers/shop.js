const fs = require('fs');
const path = require('path');
const pdfDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');
const OrderItem = require('../models/order-item');

const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
    
    const page = +req.query.page || 1;
    let totalItems;
    const offset = (page - 1) * ITEMS_PER_PAGE;
    
    Product.findAndCountAll({
        where: {},
        limit: ITEMS_PER_PAGE,
        offset
    }).then(products => {
        console.log('getProducts----------------', products)
        res.render('shop/product-list', {
            products: products.rows,
            pageTitle: 'All Products',
            path: '/products',
            totalProducts: products.count,
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < products.count,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(products.count / ITEMS_PER_PAGE)
        })
    }).catch(err => {
        console.log('error===========', err)
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    }).catch(err => console.log(err));
}

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findAll({
        where: {
            id: prodId
        }
    }).then(product => {
        res.render('shop/product-detail', {
            product: product[0],
            pageTitle: product[0].title,
            path: '/products'
        })
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;
    const offset = (page - 1) * ITEMS_PER_PAGE;
    Product.findAndCountAll({
        where: {},
        limit: ITEMS_PER_PAGE,
        offset
        // offset: offset
    }).then(products => {
        totalItems = products.count;
        res.render('shop/index', {
            products: products.rows,
            pageTitle: 'Shop',
            path: '/',
            totalProducts: products.count,
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < products.count,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(products.count / ITEMS_PER_PAGE)
        });
    }).catch(err => {
        console.log('err----------------------', err)
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}

exports.getCart = (req, res, next) => {
    req.user.getCart()
        .then(cart => {
            console.log(cart)
            cart.getProducts()
                .then(products => {
                    res.render('shop/cart', {
                        path: '/cart',
                        pageTitle: 'Your Cart',
                        products
                    })
                })
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    let fetchedCart;
    let newQuantity = 1;
    console.log(req.user.getCart)
    req.user
        .getCart()
        .then(cart => {
            fetchedCart = cart;
            return cart.getProducts({
                where: {
                    id: prodId
                }
            });
        })
        .then(products => {
            let product;
            if (products.length > 0) {
                product = products[0];
            }

            if (product) {
                const oldQuantity = product.cartItem.quantity;
                newQuantity = oldQuantity + 1;
                return product;
            }
            return Product.findById(prodId);
        })
        .then(product => {
            return fetchedCart.addProduct(product, {
                through: {
                    quantity: newQuantity
                }
            });
        })
        .then(() => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user.getCart().then(cart => {
        return cart.getProducts({
            where: {
                id: prodId
            }
        })
    }).then(products => {
        const product = products[0];
        return product.cartItem.destroy();
    }).then(result => {
        res.redirect('/cart');
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}

exports.getOrders = (req, res, next) => {
    req.user
        .getOrders({
            include: ['products']
        })
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postOrder = (req, res, next) => {
    let fetchedCart;
    req.user
        .getCart()
        .then(cart => {
            fetchedCart = cart;
            return cart.getProducts();
        })
        .then(products => {
            return req.user
                .createOrder()
                .then(order => {
                    return order.addProducts(
                        products.map(product => {
                            product.orderItem = {
                                quantity: product.cartItem.quantity
                            };
                            return product;
                        })
                    );
                })
                .catch(err => console.log(err));
        })
        .then(result => {
            return fetchedCart.setProducts(null);
        })
        .then(result => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getCheckout = (req, res, next) => {
    req.user.getCart()
        .then(cart => {
            cart.getProducts()
                .then(products => {
                    let totalPrice;
                    products.forEach(product =>  {
                       totalPrice =  product.price * product.cartItem.quantity
                    })
                    res.render('shop/checkout', {
                        path: '/checkout',
                        pageTitle: 'Checkout',
                        products,
                        totalSum: totalPrice
                    })
                })
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
}

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId).then(order => {
        if (!order) {
            return next(new Error('No order found!'));
        }

        if (order.userId !== req.user.id) {
            return next(new Error('Unauthorized!'));
        }
        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join('data', 'invoices', 'invoice-' + orderId + '.pdf');
        const pdfDoc = new pdfDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);

        pdfDoc.fontSize(26).text('Invoice', {
            underline: true
        });
        pdfDoc.text('-----------------------');
        let totalPrice = 0;

        req.user
            .getOrders({
                include: ['products']
            }).then(orders => {
                orders.filter(od => {
                    return od.id == orderId;
                }).forEach(product => {
                    product.products.forEach(product => {
                        totalPrice += product.orderItem.quantity * product.price;
                        pdfDoc
                            .fontSize(14)
                            .text(
                                product.title +
                                ' - ' +
                                product.orderItem.quantity +
                                ' x ' +
                                '$' +
                                product.price
                            );
                    })
                })

                pdfDoc.text('---');
                pdfDoc.fontSize(20).text('Total Price: $' + totalPrice);
                pdfDoc.end();
            }).catch(err => console.log(err));
    }).catch(err => {
        console.log('err====================', err)
        next(err)
    });

};