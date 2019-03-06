const path = require('path');

const express = require('express');

const {body} = require('express-validator/check');

const router = express.Router();

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

// /admin/products => GET
router.get('/products', adminController.getProducts);

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/add-product => POST
router.post('/add-product',[
    body('title', 'Please enter title and at least 3 charactors.')
      .isString()
      .isLength({ min: 3 })
      .trim(),
    // body('imageUrl', 'Please enter correct image url').isURL(),
    body('price', 'Please enter correct price.').isFloat(),
    body('description', 'Please enter description and at least 5 charactors.')
      .isLength({ min: 5, max: 400 })
      .trim()
  ], isAuth, adminController.postAddProduct);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product', [
    body('title')
      .isString()
      .isLength({ min: 3 })
      .trim(),
    // body('image').isURL(),
    body('price').isFloat(),
    body('description')
      .isLength({ min: 5, max: 400 })
      .trim()
  ], isAuth, adminController.postEditProduct);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;