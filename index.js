const path = require("path");
const express = require("express");
const db_manager = require("./ofor_db");

const app = express();
const PORT = 8080;

app.use(express.urlencoded({ extended: true }));

app.use('/static', express.static(path.join(__dirname, "/static")));
app.use('/js', express.static(path.join(__dirname, '/js')));

app.use('/css', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/js')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/@popperjs/core/dist/umd')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.get('/player/:player_id', (req, res) => {
	equipment_slots = 
	[
		"head",
		"body",
		"leg",
		"hand",
		"feet"
	];
	ourPlayer = []
	equipment = [];

	function get_equipment(equipment, onSlot) {
		if (onSlot < equipment_slots.length) {
			db_manager.find_equipment(ourPlayer[2][equipment_slots[onSlot]], equipment_slots[onSlot], (err, result) => {
				if (err) {
					console.log(err);
				} else {
					equipment.push(result);
					get_equipment(equipment, onSlot + 1);
				}
			});
		} else {
			viewPlayer = {
				player_name: ourPlayer[0].player_name.trim(),
				player_level: ourPlayer[0].player_level,
				class_name: ourPlayer[1].class_name.trim(),
				player_str: 0 + ourPlayer[1].base_str,
				player_int: 0 + ourPlayer[1].base_int,
				player_dex: 0 + ourPlayer[1].base_dex,
				player_cha: 0 + ourPlayer[1].base_cha,
				player_equ: equipment
			}
			for (let equipmentItem of equipment) {
				viewPlayer.player_str += equipmentItem.bonus_str;
				viewPlayer.player_dex += equipmentItem.bonus_dex;
				viewPlayer.player_int += equipmentItem.bonus_int;
				viewPlayer.player_cha += equipmentItem.bonus_cha;
			}
			res.render('viewplayer', {title: "View Player", player: viewPlayer});
		}
	}

	const { player_id } = req.params;
	db_manager.find_player(parseInt(player_id), (err, result) => {
		if (err) {
			console.log(err)
		} else {
			db_manager.find_class(result.player_class, (classErr, classResult) => {
				if (classErr) {
					console.log(classErr);
				} else {
					db_manager.find_player_equipment(parseInt(player_id), (eqErr, eqResult) => {
						ourPlayer.push(result);
						ourPlayer.push(classResult);
						ourPlayer.push(eqResult);
						get_equipment(equipment, 0);
					});
				}
			});
		}
		
	});
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
	db_manager.list_equipment(category, (err, result) => {
		if (err) {
			console.log(err);
		} else {
			const pageTitle = `${category} Equipment List`
			res.render('tablelist', {title: pageTitle, slot: category, equipment: result});
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

app.get('/', (req, res) => {
	res.render('index', {title: "Home"});
});

app.listen(PORT, () => {
	const strin = `listening on port: ${PORT}`;
	console.log(strin);
});