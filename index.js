const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser")
const db_manager = require("./ofor_db");

const app = express();
const PORT = 8080;

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SERVSECRET));

app.use('/static', express.static(path.join(__dirname, "/static")));
app.use('/js', express.static(path.join(__dirname, '/js')));

app.use('/css', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/js')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/@popperjs/core/dist/umd')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

var equipment_slots = 
[
	"head", 
	"body", 
	"leg", 
	"hand", 
	"feet",
	"arms",
	"arms"
];

function user_logged_in(req) {
	if (req.signedCookies.userID && req.signedCookies.userID != -1) {
		return true;
	} else {
		return false;
	}
}

app.get('/newcharacter', (req, res) => {
	if (user_logged_in(req)) {
		res.render('newcharacter',{title: 'Create New Character'});
	} else {
		res.redirect(302, '/login');
	}
});

app.post('/altercharacter', (req, res) => {
	const ourCharID = parseInt(req.body.chID);
	const ourItemID = parseInt(req.body.eqID);
	const ourSlot = req.body.eqSlot;
	db_manager.modify_character_equipment(ourCharID, ourItemID, ourSlot, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			res.redirect(301, `/characters/${ourCharID}`);
		}
	});
});

app.get('/characters', (req, res) => {
	if (user_logged_in(req)) {
		db_manager.list_characters(req.signedCookies.userID, (charErr, charResult) => {
			res.render('characterlist', {title: 'Your Characters', 
				loggedIn: user_logged_in(req), 
				characters: charResult});
		});
	} else {
		res.redirect(302, '/login');
	}
});

app.post('/additem', (req, res) => {
	db_manager.add_equipment(req.body.slot, req.body, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			res.redirect(301, `/list/${req.body.slot}`);
		}
	});
});

app.get('/list/:category', (req, res) => {
	const { category } = req.params;
	var picking = false;
	var ourPlayer = 0;
	if (req.query.p === 'true') {
		picking = true;
		ourPlayer = parseInt(req.query.pid);
	}
	db_manager.list_equipment(category, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			const pageTitle = `${category} Equipment List`
			res.render('tablelist', {
				title: pageTitle,
				loggedIn: user_logged_in(req),
				slot: category, 
				equipment: result, 
				picking: picking, 
				ourPlayer: ourPlayer});
		}
	});
});

app.get('/characters/:charID', (req, res) => {
	function find_equipment_items(onSlot, eqItems, callBack) {
		if (onSlot < equipment_slots.length) {
			db_manager.find_equipment_item(eqItems[onSlot], onSlot, (err, result) => {
				if (err) {
					callBack(err, null);
				} else {
					equipment.push(result);
					find_equipment_items(onSlot + 1, eqItems, callBack);
				}
			});
		} else {
			callBack(null, 'test');
		}
	}
	var equipment = []
	const { charID } = req.params;
	if (user_logged_in(req)) {
		db_manager.find_character_by_id(charID, (err, charResult) => {
			db_manager.find_class(charResult.class_id, (classErr, classResult) =>{
				db_manager.find_character_equipment(charID, (eqErr, eqResult) =>{
					find_equipment_items(0, [
						eqResult.head,
						eqResult.body,
						eqResult.leg,
						eqResult.hand, 
						eqResult.feet,
						eqResult.left_hand,
						eqResult.right_hand
						], (eqFindErr, eqFindRes) => {
						var stats = {
							str: classResult.class_str,
							int: classResult.class_int,
							dex: classResult.class_dex,
							cha: classResult.class_cha
						}
						for (let equipmentItem of equipment) {
							stats.str += parseInt(equipmentItem.equipment_str),
							stats.int += equipmentItem.equipment_int,
							stats.dex += equipmentItem.equipment_dex,
							stats.cha += equipmentItem.equipment_cha
						}
						res.render('viewcharacter', 
							{
								title: charResult.character_name, 
								loggedIn: user_logged_in(req),
								character: charResult, 
								charClass: classResult,
								stats: stats, 
								equipment: equipment
							});
					});
				});
			});
		});
	} else {
		res.redirect(302, '/login');
	}
});

app.get('/logout', (req, res) => {
	if (user_logged_in(req)) {
		res.cookie('userID', -1, {signed: true});
		res.redirect(302, 'login');
	} else {
		res.redirect(302, 'login');
	}
});

app.post('/login', (req, res) => {
	db_manager.find_user_by_email(req.body.loginEmail, (err, result) => {
		if (err) {
			console.log(err)
		} else {
			if (result) {
				res.cookie('userID', result.user_id, {signed: true});
				res.redirect(302, '/');
			} else {
				res.redirect(302, 'login');
			}
		}
	});
});

app.get('/login', (req, res) => {
	if (user_logged_in(req)) {
		res.redirect(307, '/');
	} else {
		res.render('login', {title: "Login", loggedIn: user_logged_in(req)});
	}
});

app.get('/', (req, res) => {
	if (user_logged_in(req)) {
		db_manager.find_user_by_id(req.signedCookies.userID, (err, result) => {
			db_manager.list_characters(req.signedCookies.userID, (charErr, charResult) => {
				res.render('index', {title: "Home", loggedIn: true, user: result, characters: charResult});
			});
		});
	} else {
		res.render('index', {title: "Home", loggedIn: false});
	}
});

app.listen(PORT, () => {
	const strin = `listening on port: ${PORT}`;
	console.log(strin);
});