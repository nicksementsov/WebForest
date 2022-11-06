const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser")
const bcrypt = require("bcrypt");
const db_manager = require("./ofor_db");

const app = express();
const PORT = 8080;
const saltRounds = 10;

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

const check_user_logged = (req, res, next) => {
	if (!req.signedCookies.userID || req.signedCookies.userID == -1) {
		return res.redirect('/login');
	} else {
		next();
	}
}

function buildCharacter(charID, callBack) {
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
	var equipment = [];
	db_manager.find_character_by_id(charID, (err, charResult) => {
		db_manager.find_class(charResult.class_id, (classErr, classResult) => {
			db_manager.find_character_equipment(charID, (eqErr, eqResult) => {
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
					callBack(null, {charResult, classResult, stats, equipment});
				});
			});
		});
	});
}

app.get('/requestCharacter/:charID', (req, res) => {
	const { charID}  = req.params;
	buildCharacter(charID, (err, result) => {
		res.send(result);
	});
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

app.get('/characters', check_user_logged, (req, res) => {
	db_manager.list_characters(req.signedCookies.userID, (charErr, charResult) => {
		res.render('characterlist', {title: 'Your Characters', 
			loggedIn: true, 
			characters: charResult});
	});
});

app.post('/additem', (req, res) => {
	db_manager.add_equipment(req.body.category, req.body, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			res.redirect(301, `/list/${req.body.category}`);
		}
	});
});

app.get('/list/:category', (req, res) => {
	var { category } = req.params;
	var picking = false;
	var ourPlayer = 0;
	var ourSlot = null;
	if (req.query.p === 'true') {
		picking = true;
		ourPlayer = parseInt(req.query.pid);
		ourSlot = req.query.slot;
	}
	db_manager.list_equipment(category, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			const pageTitle = `${category} Equipment List`
			res.render('tablelist', {
				title: pageTitle,
				loggedIn: user_logged_in(req),
				category: category, 
				slot: ourSlot,
				equipment: result, 
				picking: picking, 
				ourPlayer: ourPlayer});
		}
	});
});

app.post('/embark', check_user_logged, (req, res) => {
	console.log(req.body);
	res.redirect(302, '/embark');
});

app.get('/embark', check_user_logged, (req, res) => {
	db_manager.list_characters(req.signedCookies.userID, (charErr, charResult) => {
		db_manager.list_quests(100, (questErr, questResult) => {
			console.log(questResult);
			res.render('embark', {title: 'New Quest',
				loggedIn: true,
				ourUserID: req.signedCookies.userID,
				characters: charResult,
				quests: questResult
			});
		});
	});
});


app.get('/characters/:charID', (req, res) => {
	const { charID } = req.params;
	buildCharacter(charID, (err, result) => {
		console.log(result);
		res.render('viewcharacter',
			{title: result.charResult.character_name,
				loggedIn: user_logged_in(req),
				character: result.charResult,
				charClass: result.classResult,
				stats: result.stats,
				equipment: result.equipment
			});
	});
});

app.post('/newcharacter', check_user_logged, (req, res) => {
	db_manager.add_character(
		parseInt(req.body.userID),
		{
			classID: parseInt(req.body.classSelection),
			characterName: req.body.characterName
		},
		(err, result) => {
			res.redirect(302, '/characters');
		});
});

app.get('/newcharacter', check_user_logged, (req, res) => {
	db_manager.find_user_by_id(req.signedCookies.userID, (err, result) => {
		if (err) {
			res.redirect(302, '/');
		} else {
			db_manager.list_classes((classErr, classResult) => {
				res.render('newcharacter',{title: 'Create New Character', 
					loggedIn: true, classes: classResult, ourUser: req.signedCookies.userID});
			});
		}
	});
});

app.post('/logout', check_user_logged, (req, res) => {
	res.cookie('userID', -1, {signed: true});
	res.redirect(302, '/');
});

app.post('/login', (req, res) => {
	db_manager.find_user_by_email(req.body.loginEmail, (err, result) => {
		if (err) {
			console.log(err)
		} else {
			if (result) {
				bcrypt.compare(req.body.loginPassword, result.hashed_salted, (bcErr, bcRes) => {
					if (bcRes) {
						res.cookie('userID', result.user_id, {signed: true});
						res.redirect(302, '/characters');
					} else {
						res.redirect(302, '/login');
					}
				});
			} else {
				res.redirect(302, '/login');
			}
		}
	});
});

app.post('/register', (req, res) => {
	if (req.body.regPasswordOne !== req.body.regPasswordTwo) {
		res.redirect(302, '/login');
	} else {
		db_manager.check_email_in_use(req.body.regEmail, (checkErr, checkRes) => {
			if (!checkRes.exists) {
				bcrypt.genSalt(saltRounds, (saltErr, salt) => {
					bcrypt.hash(req.body.regPasswordOne, salt, (hashErr, hash) => {
						db_manager.add_user(req.body.regEmail, req.body.regName, hash, (addUserErr, addUserRes) => {
							res.cookie('userID', addUserRes.user_id, {signed: true});
							res.redirect(302, '/characters');
						});
					});
				});
			} else {
				res.redirect(302, '/login');
			}
		});
	}
});

app.get('/login', (req, res) => {
	if (user_logged_in(req)) {
		res.redirect(307, '/');
	} else {
		res.render('login', {title: "Login", loggedIn: false});
	}
});

app.get('/', (req, res) => {
	if (user_logged_in(req)) {
		db_manager.find_user_by_id(req.signedCookies.userID, (err, result) => {
			res.render('index', {title: "Home", loggedIn: true, user: result});
		});
	} else {
		res.render('index', {title: "Home", loggedIn: false});
	}
});

app.listen(PORT, () => {
	const strin = `listening on port: ${PORT}`;
	console.log(strin);
});