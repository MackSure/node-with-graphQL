// const mysql = require('mysql2');

//  const pool = mysql.createPool({
//      host: 'localhost',
//      user: 'root',
//      database: 'node_complete',
//      password: 'rz871210rz'
//  });

//  module.exports = pool.promise();

const Sequelize = require('sequelize');

const sequelize = new Sequelize('node_complete', 'root', 'rz871210rz', {
    dialect: 'mysql',
    host: 'localhost'
});

module.exports = sequelize;