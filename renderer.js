// @flow
/*jshint esversion: 6 */
/*jslint node: true */
"use strict";

const {ipcRenderer} = require("electron");
const {clipboard} = require('electron');
let tableify = require("tableify");

let memos = [], options = [], oldOptions = [], privTxs = [], shieldedOpts = [], transOpts = [], txs = [];
let genHistory = {"transparent": false, "private": false};
	
function hexToString(s) {
    let str = "";
    for (let i = 0; i < s.length; i++) {
        let charCode = parseInt(s[(i * 2)] + s[(i * 2) + 1], 16);
        str += String.fromCharCode(charCode);
    }
    return str;
}



function generateQuery(method, params) {
    let jsonObject;
    jsonObject = {"jsonrpc": "1.0", "id": method, "method": method, "params": params};
    ipcRenderer.send("jsonQuery-request", jsonObject);
    return (jsonObject);
}

function generateQuerySync(method, params) {
    let jsonObject;
    jsonObject = {"jsonrpc": "1.0", "id": method, "method": method, "params": params};
    return ipcRenderer.sendSync("jsonQuery-request-sync", jsonObject);
}

function format (txid) {
	let res = generateQuerySync("gettransaction", [txid]);
    let datetime = new Date(res.result.time * 1000);
    datetime = datetime.toLocaleTimeString() + " - " + datetime.toLocaleDateString();
    let category = (res.result.amount < 0.0) ? "send" : "receive";
    let obj = {
        blockhash: res.result.blockhash,
        txid: res.result.txid
    };
	
    // `d` is the original data object for the row
    return '<table cellpadding="5" cellspacing="0" border="0" style="width:100%; text-align:left;">'+
        '<tr><th>Transaction ID <a href="#" target="_blank" onclick="openTX(\''+obj.txid+'\'); return false;"> (View TX)</a></th></tr>' +
            '<tr><td>' + obj.txid + '</td>' +
        '</tr><tr><th>Blockhash</th></tr><tr><td>' + obj.blockhash + '</td></tr></table>';
}

function generateMemoTable(memos) {
    let localMemos = memos;
    localMemos.sort(function (a, b) { // sort table by date
        if (b.time === a.time) {
            return b.address - a.address;
        }
        return b.time - a.time;
    });
	
		var findMemoTable = $("#memoTable");

	if(!findMemoTable[0]){
	var table = document.createElement('table');
	var tableHead = table.createTHead();
	var th = tableHead.insertRow(-1);

	
		let heading = new Array();
		heading[0] = ""
		heading[1] = "Amount";
	heading[2] = "Address";
	heading[3] = "Memo";
	heading[4] = "Time";
	
		let tableBody = table.createTBody();

	  // Insert cells into the header row.
	
  for (let i=0; i<heading.length; i++)
	{
		let thCell = th.insertCell(-1);
		thCell.align = "center";
		thCell.style.fontWeight = "bold";
		thCell.innerHTML = heading[i];
	}
	
    for (let i = 0; i < localMemos.length; i++) {
					if(localMemos[i].amount == ""){
						continue;
					}
					var getProp = "";
					var tr = tableBody.insertRow(-1);
					tr.id = localMemos[i].txid;
									for(let x = 0; x < heading.length; x++){

							let td = tr.insertCell(-1);
							if(heading[x] != ""){
								getProp = heading[x].toLowerCase();
							} 
							
							if(heading[x] != "Time" && heading[x] != ""){
							td.innerHTML = localMemos[i][getProp];
							}  else if(heading[x] ==  "Time") {
								let datetime = new Date(localMemos[i].time * 1000);
								localMemos[i].time = datetime;
								td.innerHTML = datetime.toLocaleDateString() + " - " + datetime.toLocaleTimeString();
							} else {
								td.className = "details-control";
							}
									}
    }
    // build empty table if no results
    if (localMemos.length < 1) {
        localMemos[0] = {"amount": "", "address": "", "memo": "", "time": "", "details": ""};
    }
			table.id = "memoTable";
	    	table.className += "table table-hover";
			table.width = "100%";

	  document.getElementById("memoPageinner").innerHTML = table.outerHTML;
	  
	  $(document).ready(function() {
    $('#memoTable').DataTable( {
        "pageLength": 5,
		"searching": false,
		"bLengthChange": false,
		"ordering": false
    } );
	} );
	
	    // Add event listener for opening and closing details
		$(document).ready(function () {
    $('#transactionsTable tbody').on('click', 'td.details-control', function () {
		var getTable = $('#memoTable').DataTable();
        var tr = $(this).closest('tr');
        var row = getTable.row(tr);
 
        if ( row.child.isShown() ) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        }
        else {
            // Open this row
            row.child( format(tr[0].id)).show();
            tr.addClass('shown');
        }
    } );
		});
	} else {
		

			

		
		
	}
}



function generateHistoryTable(txs, privTxs, override) {
	
	var findTransactionTable = $("#transactionsTable");
	
	if(!findTransactionTable[0] || override == true){
    var table = document.createElement('table');
	var tableHead = table.createTHead();
	var th = tableHead.insertRow(-1);

	
		let heading = new Array();
		heading[0] = "";
	heading[1] = "Category";
	heading[2] = "Amount";
	heading[3] = "Address";
	heading[4] = "Confirmations";
	heading[5] = "Time";
	
	  // Insert cells into the header row.
	
  for (let i=0; i<heading.length; i++)
	{
		let thCell = th.insertCell(-1);
		thCell.align = "center";
		thCell.style.fontWeight = "bold";
		thCell.innerHTML = heading[i];
	}

	let tableBody = table.createTBody();
	
    let combinedTxs = [].concat(txs, privTxs);
	var totalTxs = combinedTxs.length - 1;
	localStorage.zclLastTX =  combinedTxs[totalTxs].txid;
    combinedTxs.sort(function (a, b) {
        if (b.time === a.time) {
            return b.address - a.address;
        }
        return b.time - a.time;
    });
    for (let i = 0; i < privTxs.length; i++) {
        privTxs[i].address = privTxs[i].address.substr(0, 16) + "......" + privTxs[i].address.substr(-16);
    }
    memos = [];
    for (let i = 0; i < combinedTxs.length; i++) {
        if (combinedTxs[i].memo && combinedTxs[i].memo.substr(0, 6) !== "f60000") {
            memos.push({
                amount: combinedTxs[i].amount,
                address: combinedTxs[i].address,
                txid: combinedTxs[i].txid,
                memo: hexToString(combinedTxs[i].memo),
                time: combinedTxs[i].time
            });
        } else {
			
					var tr = tableBody.insertRow(-1);
					tr.id = combinedTxs[i].txid;
				for(let x = 0; x < heading.length; x++){
							let td = tr.insertCell(-1);
							let getProp = heading[x].toLowerCase();
							if(heading[x] != "Time" && heading[x] != ""){
							td.innerHTML = combinedTxs[i][getProp];
							}  else if(heading[x] ==  "Time") {
								let datetime = new Date(combinedTxs[i].time * 1000);
								combinedTxs[i].time = datetime;
								td.innerHTML = datetime.toLocaleDateString() + " - " + datetime.toLocaleTimeString();
							} else {
								td.className = "details-control";
							}
						}

		}
    }
    // build empty table if no results
    if (combinedTxs.length < 1) {
        combinedTxs[0] = {
            "address": "No received transactions found",
            "amount": 0,
            "category": "",
            "confirmations": "",
            "time": "",
            "details": ""
        };
    }
			table.id = "transactionsTable";
	    	table.className += "table table-hover";
			table.width = "100%";

	  document.getElementById("transactionTransparentSpan").innerHTML = table.outerHTML;
	  
	  $(document).ready(function() {
    $('#transactionsTable').DataTable( {
        "pageLength": 5,
		"searching": false,
		"bLengthChange": false,
		"ordering": false
    } );
	} );
	
	    // Add event listener for opening and closing details
		$(document).ready(function () {

    $('#transactionsTable tbody').on('click', 'td.details-control', function () {
		var getTable = $('#transactionsTable').DataTable();
        var tr = $(this).closest('tr');
        var row = getTable.row(tr);
 
        if ( row.child.isShown() ) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        }
        else {
            // Open this row
            row.child( format(tr[0].id)).show();
            tr.addClass('shown');
        }
    } );
		});	  

} else {

		    var combinedTxs = [].concat(txs, privTxs);
			var getLastTX = generateQuerySync("gettransaction", [localStorage.zclLastTX]);
			var result = $.grep(combinedTxs, function(e){ return e.time > getLastTX.result.time})
			if(result.length > 0){
					generateHistoryTable(txs, privTxs, true);
			}
	
}
}



ipcRenderer.on("jsonQuery-reply", (event, arg) => {
    if (arg.error && arg.error.code === -28) {
        document.getElementById("alertSpan").innerHTML = '<i class="fa fa-refresh fa-spin"></i> <h4>' + arg.error.message + '</h4>';
    }
    else {
        document.getElementById("alertSpan").innerHTML = "";
    }
	
		    if (arg.id === "getinfo" && arg.result) {
        document.getElementById("syncBlockHeight").innerHTML = arg.result.blocks;
    }

    if (arg.id === "getnetworkinfo" && arg.result) {
        document.getElementById("connectionsValue").innerHTML = arg.result.connections;
    }
    else if (arg.id === "getblockchaininfo" && arg.result) {
        let status = ((arg.result.blocks / arg.result.headers) * 100).toFixed(1);
		
		if(isNaN(status))
			status = 0;
		
		document.getElementById("syncStatusValue").innerHTML = status + "%";
		
        if (status < 25) {
            document.getElementById("syncStatusLabel").style.color = "red";
        } else if (status > 25 && status < 75){
			 document.getElementById("syncStatusLabel").style.color = "orange";
		}
        else {
            document.getElementById("syncStatusLabel").style.color = "green";
			document.getElementById("syncStatusLabel").style.fontWeight = "bold";

        }
    }
    else if (arg.id === "z_gettotalbalance" && arg.result) {
        document.getElementById("currentBalanceValue").innerHTML = arg.result.total;
        document.getElementById("transparentBalanceValue").innerHTML = arg.result.transparent;
        document.getElementById("privateBalanceValue").innerHTML = arg.result.private;
    }
    else if (arg.id === "listtransactions" && arg.result) {
        let table = arg.result;
        for (let i = 0; i < table.length; i++) {
            delete table[i]["account"];
            delete table[i]["blockhash"];
            delete table[i]["blockindex"];
            delete table[i]["blocktime"];
            delete table[i]["fee"];
            delete table[i]["size"];
            delete table[i]["timereceived"];
            delete table[i]["vjoinsplit"];
            delete table[i]["vout"];
            delete table[i]["walletconflicts"];
            txs.push(table[i]);
        }
        genHistory.transparent = true;
    }
    else if (arg.id === "listaddressgroupings" && arg.result) {
        let table = [];
        let ctr = 0;
        for (let i = 0; i < arg.result.length; i++) {
            for (let n = 0; n < arg.result[i].length; n++) {
                table[ctr] = {'Transparent Address <a href="#" data-toggle="tooltip" data-placement="top" title="New Transparent Address" onclick="getNewTransparentAddress()">&nbsp;<i class="fa fa-plus-circle" style="color:green"></i></a>': arg.result[i][n][0] + '&nbsp;<a href="#" title="Copy Address To Clipboard" onclick="copyAddress(\'' + arg.result[i][n][0] + '\')"><i class="fa fa-clipboard" style="color:#c87035"></i></a>', "Amount": arg.result[i][n][1]};
                ctr += 1;
                let option = document.createElement("option");
                option.text = arg.result[i][n][0] + " (" + arg.result[i][n][1] + ")";
                option.value = arg.result[i][n][0];
                let pushed = false;
                for (let x = 0; x < transOpts.length; x++) {
                    if (transOpts[x].value === option.value) {
                        if (arg.result[i][n][1] > 0) {
                            transOpts[x] = option;
                            pushed = true;
                        } else if (arg.result[i][n][1] === 0) {
                            transOpts.splice(x, 1);
                            pushed = true;
                        }
                        break;
                    }
                }
                if ((pushed === false) && (arg.result[i][n][1] > 0)) {
                    transOpts.push(option);
                }
            }
        }
        // build empty table if no results
        if (arg.result.length < 1) {
            table[0] = {'Transparent Address <a href="#" data-toggle="tooltip" data-placement="top" title="New Transparent Address" onclick="getNewTransparentAddress()">&nbsp;<i class="fa fa-plus-circle" style="color:green"></i></a>': "No addresses with received balances found", "amount": 0};
        }
        let tableElement = tableify(table);
        let div = document.createElement("div");
        div.innerHTML = tableElement;
        div.firstElementChild.className += "table table-hover";
        if (document.getElementById("addressTransparentSpan").innerHTML !== div.innerHTML) {
            document.getElementById("addressTransparentSpan").innerHTML = div.innerHTML;
        }
    }
    else if (arg.id === "z_listaddresses" && arg.result) {
        let table = [];
        let ctr = 0;
        for (let i = 0; i < arg.result.length; i++) {
            let res = generateQuerySync("z_getbalance", [arg.result[i], 0]);
            table[ctr] = {'Private Address <a href="#" data-toggle="tooltip" data-placement="top" title="New Private Address" onclick="getNewPrivateAddress()">&nbsp;<i class="fa fa-plus-circle" style="color:green"></i></a>': arg.result[i] + '&nbsp;<a href="#" title="Copy Address To Clipboard" onclick="copyAddress(\'' + arg.result[i] + '\')"><i class="fa fa-clipboard" style="color:#c87035"></i></a>', "amount": res.result};
            ctr += 1;
            if (res.result > 0) {
                let option = document.createElement("option");
                option.text = arg.result[i] + " (" + res.result + ")";
                option.value = arg.result[i];
                let pushed = false;
                for (let x = 0; x < shieldedOpts.length; x++) {
                    if (shieldedOpts[x].value === option.value) {
                        shieldedOpts[x] = option;
                        pushed = true;
                    }
                }
                if (pushed === false) {
                    shieldedOpts.push(option);
                }
            }
        }
        // build empty table if no results
        if (arg.result.length < 1) {
            table[0] = {'Private Address <a href="#" data-toggle="tooltip" data-placement="top" title="New Private Address" onclick="getNewPrivateAddress()"><i class="fa fa-plus-circle" style="color:green"></i></a>': "No addresses with received balances found", "amount": 0};
        }
        let tableElement = tableify(table);
        let div = document.createElement("div");
        div.innerHTML = tableElement;
        div.firstElementChild.className += "table table-hover";
        if (document.getElementById("addressPrivateSpan").innerHTML !== div.innerHTML) {
            document.getElementById("addressPrivateSpan").innerHTML = div.innerHTML;
        }

        // gather a list of TXIDs associated with z_addresses
        for (let i = 0; i < arg.result.length; i++) {
            let res = generateQuerySync("z_listreceivedbyaddress", [arg.result[i], 0]);
            for (let n = 0; n < res.result.length; n++) {
                let tx = generateQuerySync("gettransaction", [res.result[n].txid]);
                privTxs.push({
                    address: arg.result[i],
                    txid: tx.result.txid,
                    amount: res.result[n].amount,
                    memo: res.result[n].memo,
                    category: "receive",
                    time: tx.result.time,
                    confirmations: tx.result.confirmations
                });
            }
        }
        genHistory.private = true;
    }
    else if (arg.id === "listreceivedbyaddress" && arg.result) {
        let unusedAddresses = [];
        for (let i = 0; i < arg.result.length; i++) {
            if (arg.result[i].amount === 0) {
                unusedAddresses.push(arg.result[i].address);
            }
            if (unusedAddresses.length === 0) {
                document.getElementById("newTransparentAddress").click();
            }
        }
    }
    else if (arg.id === "sendmany") {
        if (arg.result === null) {
            window.alert("There was an error:\n\n" + arg.error.message);
        }
        else {
            window.alert("Successfully transmitted transaction.\n\nTXID: " + arg.result);
        }
    }
    else if (arg.id === "z_sendmany") {
        if (arg.result === null) {
            window.alert("There was an error:\n\n" + arg.error.message);
        }
        else {
            window.alert("Successfully initiated private transaction.\n\nTXID: " + arg.result);
        }
    }
});

ipcRenderer.on("coin-reply", (event, arg) => {
    let elements = document.getElementsByClassName("coin");
    for (let i = 0; i < elements.length; i++) {
        elements[i].innerHTML = arg;
    }
});

ipcRenderer.on("params-pending", (event, arg) => {
    if (arg.percent < 1) {
        document.getElementById("alertSpan").innerHTML = '<i class="fa fa-refresh fa-spin"></i> <h4 style="text-align: center;">Downloading proving and verification keys</h4>' +
            '<h4 style="text-align: center;">' + (arg.name.substr(arg.name.lastIndexOf('/') + 1)) + '</h4>' +
            '<h4 style="text-align: center;">' + (arg.percent * 100).toFixed(2) + '%</h4>';
    }
    else if (!arg.percent || arg.percent === 1) {
        document.getElementById("alertSpan").innerHTML = "";
    }
});

ipcRenderer.on("params-complete", (event, arg) => {
    if (arg === false) {
        document.getElementById("alertSpan").innerHTML = '<i class="fa fa-refresh fa-spin"></i> <h3 style="text-align: center;">Initializing</h3>';
    }
    else {
        document.getElementById("alertSpan").innerHTML = "";
    }
});

function refreshUI() {
    ipcRenderer.send("coin-request");
    ipcRenderer.send("check-params");
    ipcRenderer.send("check-config");
    ipcRenderer.send("check-wallet");
    generateQuery("getblockchaininfo", []);

    // for receivePage
    generateQuery("listreceivedbyaddress", [0, true]);

    // for historyPage
    generateQuery("listtransactions", ["*", 300, 0]);

    // for addressesPage
    generateQuery("listaddressgroupings", []);
    generateQuery("z_listaddresses", []);

    // for general use
    generateQuery("getnetworkinfo", []);
    generateQuery("getinfo", []);
    generateQuery("z_gettotalbalance", [0]);


    //sort collected options
    options = [].concat(transOpts, shieldedOpts);

    // update the private send dropdown only if needed
    let different = false;
    if (options.length !== oldOptions.length) {
        different = true;
    }
    else if (options.length === oldOptions.length) {
        for (let i = 0; i < options.length; i++) {
            if (options[i].text !== oldOptions[i].text) {
                different = true;
            }
        }
        if (!different) {
            return;
        }
    }
    if (different && options.length > 0) {
        document.getElementById("privateFromSelect").innerHTML = "";
        for (let i = 0; i < options.length; i++) {
            let doc = document.getElementById("privateFromSelect");
            doc.add(options[i]);
        }
        oldOptions = options;
        options = [];
        transOpts = [];
        shieldedOpts = [];
    }
}

function pollUI() {
    if (genHistory.transparent === true && genHistory.private === true) {
		generateHistoryTable(txs, privTxs);
        txs = [];
        privTxs = [];
        genHistory.transparent = false;
        genHistory.private = false;
        generateMemoTable(memos);
    }
}


refreshUI();
setInterval(refreshUI, 2000);
setInterval(pollUI, 1000);


module.exports = {
    generateQuerySync: function (method, params) {
        return generateQuerySync(method, params);
    },
    generateQuery: function (method, params) {
        return generateQuery(method, params);
    },
    showTxDetails: function (txid) {
        return showTxDetails(txid);
    },
    saveOpts: function (opts) {
        ipcRenderer.send("save-opts", opts);
    }
};
