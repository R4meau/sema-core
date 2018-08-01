const express = require('express');
const router = express.Router();
const semaLog = require('../seama_services/sema_logger');
const Customer = require('../model_layer/Customer');
const bodyParser = require('body-parser');

router.use(bodyParser.urlencoded({ extended: false }));

/* GET customers in the database. */


const sqlSiteIdOnly = "SELECT * " +
	"FROM customer_account " +
	"WHERE kiosk_id = ?";
const sqlBeginDateOnly = "SELECT * " +
	"FROM customer_account " +
	"WHERE kiosk_id = ? " +
	"AND created_at >= ?";
const sqlEndDateOnly = "SELECT * " +
	"FROM customer_account " +
	"WHERE kiosk_id = ? " +
	"AND created_at <= ?";
const sqlBeginEndDate = "SELECT * " +
	"FROM customer_account " +
	"WHERE kiosk_id = ? " +
	"AND created_at BETWEEN ? AND ?";
const sqlUpdatedDate = "SELECT * " +
	"FROM customer_account " +
	"WHERE kiosk_id = ? " +
	"AND updated_at > ?";

const sqlDeleteCustomers = "DELETE FROM customer_account WHERE id = ?";
const sqlGetCustomerById = "SELECT * FROM customer_account WHERE id = ?";

const sqlInsertCustomer = "INSERT INTO customer_account " +
	"(id, created_at, updated_at, name, customer_type_id, sales_channel_id, kiosk_id, " +
	"due_amount, address_line1, gps_coordinates, phone_number ) " +
	"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

const sqlUpdateCustomers = 	"UPDATE customer_account " +
	"SET updated_at = ?, name = ?, sales_channel_id = ?, " +
		"due_amount = ?, address_line1 = ?, gps_coordinates = ?, " +
		"phone_number = ? " +
	"WHERE id = ?";



router.put('/:id', async (req, res) => {
	semaLog.info('PUT sema_customer - Enter');
	req.check("id", "Parameter id is missing").exists();

	req.getValidationResult().then(function(result) {
		if (!result.isEmpty()) {
			const errors = result.array().map((elem) => {
				return elem.msg;
			});
			semaLog.error("PUT customer, Validation error" + errors.toString());
			res.status(400).send(errors.toString());
		}
		else {
			semaLog.info("CustomerId: " + req.params.id);
			findCustomers(sqlGetCustomerById, req.params.id).then(function(result) {
				let customer = new Customer();
				customer.databaseToClass(result[0]);
				customer.updateClass(req.body );


				let customerParams = [ customer.updatedDate, customer.name, customer.salesChannelId,
				customer.dueAmount, customer.address, customer.gpsCoordinates, customer.phoneNumber, customer.customerId];
				updateCustomers(sqlUpdateCustomers, customerParams, res, customer)
					.then(result =>{})
					.catch(error =>{});

			}, function(reason) {
				res.status(404).send("PUT customer: Could not find customer with id " + req.params.id);
			});
		}
	});
});




const updateCustomers = (query, params, res, customer ) => {
	return new Promise((resolve, reject) => {
		__pool.getConnection((err, connection) => {
			connection.query(query, params, function(err, result) {
				connection.release();
				if (err) {
					semaLog.error('updateCustomers customers - failed', { err });
					res.status(500).send(err.message);
					reject(err);
				}
				else {
					semaLog.info('updateCustomers customers - succeeded');

					try {
						resolve(res.json(customer.classToPlain()));
					} catch (err) {
						semaLog.error('updateCustomers customers - failed', { err });
						res.status(500).send(err.message);
						reject(err);
					}
				}
			});

		})
	});
};


router.delete('/:id', async (req, res) => {
	semaLog.info('DELETE sema_customer - Enter');

	semaLog.info(req.params.id);

	req.getValidationResult().then(function(result) {
		if (!result.isEmpty()) {
			const errors = result.array().map((elem) => {
				return elem.msg;
			});
			semaLog.error("Delete customer. Validation error");
			res.status(400).send(errors.toString());
		}
		else {
			findCustomers(sqlGetCustomerById, req.params.id).then(function(result) {
				deleteCustomers(sqlDeleteCustomers, req.params.id, res);
			}, function(reason) {
				res.status(404).send("Delete customer. Could not find customer with that id")
			});
		}
	});
});



const findCustomers = (query, params, ) => {
	return new Promise((resolve, reject) => {
		__pool.getConnection((err, connection) => {
			connection.query(query, params, function(err, result) {
				connection.release();
				if (err) {
					semaLog.error('customers - failed', { err });
					res.status(500).send(err.message);
					reject(err);
				}
				else {
					semaLog.info('customers - succeeded');

					try {
						if (Array.isArray(result) && result.length>0) {
							resolve(result);
						}
						else {
							reject(null);
						}
					} catch (err) {
						semaLog.error('customers - failed', { err });
						res.status(500).send(err.message);
						reject(err);
					}
				}
			});
		})
	});
};

const deleteCustomers = (query, params, res ) => {
	return new Promise((resolve, reject) => {
		__pool.getConnection((err, connection) => {
			connection.query(query, params, function(err, result) {
				connection.release();
				if (err) {
					semaLog.error('customers - failed', { err });
					res.status(500).send(err.message);
					reject(err);
				}
				else {
					semaLog.info(' deleteCustomers customers - succeeded');

					try {
						let msg = "Deleted customer with Id " + params.toString();
						resolve(res.status(200).send(msg));
					} catch (err) {
						semaLog.error('customers - failed', { err });
						res.status(500).send(err.message);
						reject(err);
					}

				}
			});

		})
	});
};



router.post('/', async (req, res) => {
	semaLog.info('CREATE sema_customer - Enter');

	//var postSqlParams = [];

	semaLog.info(req.body);
	req.check("customerTypeId", "Parameter customerTypeId is missing").exists();
	req.check("salesChannelId", "Parameter salesChannelId is missing").exists();
	req.check("contactName", "Parameter contactName is missing").exists();
	req.check("siteId", "Parameter siteId is missing").exists();
	req.check("address", "Parameter address is missing").exists();
	req.check("phoneNumber", "Parameter phoneNumber is missing").exists();

	req.getValidationResult().then(function(result) {
		if (!result.isEmpty()) {
			const errors = result.array().map((elem) => {
				return elem.msg;
			});
			semaLog.error("CREATE sema_customer: Validation error: " + errors.toString());
			res.status(400).send(errors.toString());
		}
		else {

			let customer = new Customer();
			customer.requestToClass(req);

			"(id, created_at, updated_at, name, customer_type_id, sales_channel_id, kiosk_id,  " +
			"due_amount, address_line1, gps_coordinates, phone_number ) " +
			"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

			let postSqlParams = [customer.customerId, customer.createdDate, customer.updatedDate,
				customer.name, customer.customerTypeId, customer.salesChannelId, customer.siteId,
				customer.dueAmount, customer.address, customer.gpsCoordinates, customer.phoneNumber ];

			insertCustomers(customer, sqlInsertCustomer, postSqlParams, res)
				.then(result =>{})
				.catch(error =>{})
		}
	});

});

const insertCustomers = (customer, query, params, res ) => {
	return new Promise((resolve, reject) => {
		__pool.getConnection((err, connection) => {
			connection.query(query, params, function(err, result) {
				connection.release();
				if (err) {
					semaLog.error('customers - failed', { err });
					res.status(500).send(err.message);
					reject(err);
				}
				else {
					semaLog.info('CREATE customer - succeeded');

					try {
						resolve(res.json(customer.classToPlain()));
					} catch (err) {
						semaLog.error('customers - failed', { err });
						res.status(500).send(err.message);
						reject(err);
					}

				}
			});

		})
	});
};


router.get('/', function(req, res) {
	semaLog.info('GET Customers - Enter');

	req.check("site-id", "Parameter site-id is missing").exists();

	req.getValidationResult().then(function(result) {
		if (!result.isEmpty()) {
			const errors = result.array().map((elem) => {
				return elem.msg;
			});
			semaLog.error("GET Customers validation error: ", errors);
			res.status(400).send(errors.toString());
		}
		else {
			semaLog.info("Site-id: " + req.query['site-id']);
			if (req.query.hasOwnProperty("updated-date")) {
				let updatedDate = new Date(req.query["updated-date"]);
				if (!isNaN(updatedDate)) {
					getCustomers( sqlUpdatedDate,
						[req.query["site-id"], updatedDate], res);
				}
				else {
					semaLog.error("GET Customers - Invalid updatedDate");
					res.status(400).send("Invalid Date");
				}
			}
			else if (req.query.hasOwnProperty("begin-date") && req.query.hasOwnProperty("end-date")) {
				let beginDate = new Date(req.query["begin-date"]);
				let endDate = new Date(req.query["end-date"]);
				if (!isNaN(beginDate) && !isNaN(endDate)) {
					getCustomers( sqlBeginEndDate,
						[req.query["site-id"], beginDate, endDate], res);
				}
				else {
					semaLog.error("GET Customers - Invalid begin-date/end-date");
					res.status(400).send("Invalid Date");
				}
			}
			else if (req.query.hasOwnProperty("begin-date")) {
				let beginDate = new Date(req.query["begin-date"]);
				if (!isNaN(beginDate)) {
					getCustomers( sqlBeginDateOnly,
						[req.query["site-id"], beginDate], res);
				}
				else {
					semaLog.error("GET Customers - Invalid begin-date");
					res.status(400).send("Invalid Date");
				}
			}
			else if (req.query.hasOwnProperty("end-date")) {
				let endDate = new Date(req.query["end-date"]);
				if (!isNaN(endDate)) {
					getCustomers( sqlEndDateOnly,
						[req.query["site-id"], endDate], res);
				}
				else {
					semaLog.error("GET Customers - Invalid end-date");
					res.status(400).send("Invalid Date");
				}
			}
			else {
				getCustomers( sqlSiteIdOnly, [req.query["site-id"]], res);
			}

		}
	});
});

const getCustomers = (query, params, res ) => {
	return new Promise((resolve, reject) => {
		__pool.getConnection((err, connection) => {

			connection.query(query, params, function(err, result) {
				connection.release();

				if (err) {
					semaLog.error('GET Customers - failed', { err });
					res.status(500).send(err.message);
					reject(err);
				}
				else {
					semaLog.info('GET Customers - succeeded');
					try {
						if (Array.isArray(result) && result.length >= 1) {
							var values = result.map(item => {
								customer = new Customer();
								customer.databaseToClass(item);
								return customer.classToPlain(item);
							});


							resolve(res.json({ customers: values }));
						} else {
							resolve(res.json({ customers: [] }));
						}




					} catch (err) {
						semaLog.error('GET Customers - failed', { err });
						res.status(500).send(err.message);
						reject(err);
					}
				}
			});

		})
	});
}


module.exports = router;
