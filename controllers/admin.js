const fileHelper = require('../util/file');
const {
  validationResult
} = require('express-validator/check');
const Product = require('../models/product');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  const errors = validationResult(req);
  if (!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: 'Attached file is not an image.',
      validationErrors: []
    });
  }
  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: 'admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title,
        price,
        description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    })
  }
  const imageUrl = image.path;
  req.user.createProduct({
      title,
      imageUrl,
      price,
      description,
      userId: req.session.user
    })
    .then(result => {
      return res.redirect('products');
    }).catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.getProducts = (req, res, next) => {
  req.user.getProducts({
    id: req.user.id
  }).then(products => {
    console.log('get products')
    res.render('admin/products', {
      products,
      pageTitle: 'Admin Products',
      path: '/admin/products'

    });
  }).catch(err => {
    console.log(err)
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  console.log('prodId----------------', prodId);
  Product.findOne({
    where: {
      id: prodId,
      userId: req.user.id
    }
  }).then(product => {
    if (!product) {
      return next(new Error('Product not found.'));
    }
    
    fileHelper.deleteFile(product.imageUrl);
    
    console.log('product===================', product)
    return product.destroy()
  }).then(result => {
    console.log('DESTROYED PRODUCT')
    res.status(200).json({message: 'Success'});
    res.redirect('/admin/products');
  }).catch(err => {
    res.status(500).json({message: 'Failed'});
  });
}

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  req.user.getProducts({
      where: {
        id: prodId
      }
    })
    .then(product => {
      if (!product[0]) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product[0],
        hasError: false,
        errorMessage: null,
        validationErrors: []
      })
    }).catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req);
  
 
  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: 'admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    })
  }
  Product.findById(prodId).then(product => {
    if (product.userId !== req.user.id) {
      return res.redirect('/');
    }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        product.imageUrl = image.path;
      }
      return product.save().then(result => {
        res.redirect('/admin/products');
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    })
}