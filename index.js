const path = require("path");
const fs = require("fs");

if (!fs.existsSync(path.join(__dirname, "saved"))) {
	fs.mkdirSync(path.join(__dirname, "saved"));
}

module.exports = function saver(mod) {
	const dataToSave = {};

	mod.hook("S_LOAD_CLIENT_ACCOUNT_SETTING", "raw", sLoadClientSetting.bind(null, "accountSettings"));
	mod.hook("S_REPLY_CLIENT_CHAT_OPTION_SETTING", "raw", sLoadClientSetting.bind(null, "chatSettings"));
	mod.hook("C_SAVE_CLIENT_ACCOUNT_SETTING", "raw", cSaveClientSetting.bind(null, "accountSettings"));
	mod.hook("C_SAVE_CLIENT_CHAT_OPTION_SETTING", "raw", cSaveClientSetting.bind(null, "chatSettings"));
	mod.hook("S_EXIT", "raw", { "filter": { "fake": null } }, sExit.bind(null));
	mod.hook("S_DECO_UI_INFO", "raw", sExit.bind(null));

	mod.command.add("setlock", () => {
		const jsonData = getData();
		jsonData.lock = !jsonData.lock;
		saveData(jsonData);
		mod.command.message(`Your settings is ${jsonData.lock ? "locked" : "unlocked"}.`);
	});

	function sLoadClientSetting(key, opcode, payload, incoming, fake) {
		const jsonData = getData();
		if (jsonData[key] && !fake) {
			mod.toClient(Buffer.from(`${jsonData[key].length}${
				getPacketInfo(payload).opcode}${jsonData[key].payload}`, "hex"));
			return false;
		}
	}

	function cSaveClientSetting(key, opcode, payload, incoming, fake) {
		dataToSave[key] = getPacketInfo(payload);
	}

	function sExit() {
		const jsonData = getData();

		if (Object.keys(dataToSave).length !== 0) {
			saveData(jsonData.lock ?
				{ ...dataToSave, ...jsonData, "lock": jsonData.lock } :
				{ ...jsonData, ...dataToSave, "lock": jsonData.lock }
			);
		}
	}

	function getData() {
		try {
			return JSON.parse(fs.readFileSync(path.join(__dirname, "saved", `${
				mod.game.serverId}-${mod.game.accountId}.json`)));
		} catch (_) {
			return {};
		}
	}

	function saveData(data) {
		fs.writeFileSync(path.join(__dirname, "saved", `${
			mod.game.serverId}-${mod.game.accountId}.json`), JSON.stringify(data, null, 4));
	}

	function getPacketInfo(payload) {
		const data = payload.toString("hex");
		return {
			"length": data.slice(0, 4),
			"opcode": data.slice(4, 8),
			"payload": data.slice(8)
		};
	}
};