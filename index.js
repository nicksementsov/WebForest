const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser")
const db_manager = require("./ofor_db");

const app = express();
const PORT = 8080;

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

app.get('/newplayer/', (req, res) => {
	res.render('newplayer',{title: 'Create New Player'});
});

app.post('/alterplayer', (req, res) => {
	const ourPlayerID = parseInt(req.body.plID);
	const ourItemID = parseInt(req.body.eqID);
	const ourSlot = req.body.eqSlot;
	db_manager.modify_player_equipment(ourPlayerID, ourItemID, ourSlot, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			res.redirect(301, `/player/${ourPlayerID}`);
		}
	});
});

app.get('/players', (req, res) => {
	db_manager.list_players((err, result) => {
		if (err) {
			console.log(err);
		} else {
			var ourPlayers = [];
			for (let player of result) 
			{
				ourPlayers.push(
					{
						id: player.player_id
						, name: player.player_name.trim()
						, level: player.player_level
						, class: player.class_name
					});
			}
			res.render('playerlist', {title: 'Player List', players: ourPlayers});
		}
	});
});

// NEW

app.get('/characters', (req, res) => {
	var loggedIn = (req.cookies.userID && req.cookies.userID != -1);
	if (loggedIn) {
		db_manager.list_characters(req.cookies.userID, (charErr, charResult) => {
			res.render('characterlist', {title: 'Your Characters', characters: charResult});
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
			res.render('tablelist', {title: pageTitle, slot: category, equipment: result, picking: picking, ourPlayer: ourPlayer});
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
	var loggedIn = (req.cookies.userID && req.cookies.userID != -1);
	if (loggedIn) {
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

app.post('/login', (req, res) => {
	db_manager.find_user_by_email(req.body.loginEmail, (err, result) => {
		if (err) {
			console.log(err)
		} else {
			res.cookie('userID', result.user_id);
			res.redirect(302, '/');
		}
	});
});

app.get('/login', (req, res) => {
	if (req.cookies.userID && req.cookies.userID != -1) {
		res.redirect(307, '/');
	} else {
		res.render('login', {title: "Login"});
	}
});

app.get('/', (req, res) => {
	var loggedIn = (req.cookies.userID && req.cookies.userID != -1);
	if (loggedIn) {
		db_manager.find_user_by_id(req.cookies.userID, (err, result) => {
			db_manager.list_characters(req.cookies.userID, (charErr, charResult) => {
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