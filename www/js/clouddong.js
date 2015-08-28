// Expose Internal DOM library
var $$ = Dom7;
var dbserver;
var transactions = {};
var groups = {};
var users = {};
var memberships = {};
var phones = {};

function isDesktop(){
	/*if ( window.location.protocol === "file:" ) {
		alert("Running on PhoneGap!");
	} else {
		alert("Running NOT on PhoneGap!");
	}*/
	return !(window.location.protocol === "file:");
}
function dateToLong(pd,hastime){
	window.formatPersian=false;
	var result;
	if(hastime)
		result =pd.format("YYYYMMDDHHmmss");
	else result=pd.format("YYYYMMDD");
	window.formatPersian=true;
	return result;
}
function formatDate(pd,hastime){
	if(hastime)
		return pd.format("dddd DD MMMM YYYY ساعت H:mm")
	return pd.format("dddd DD MMMM YYYY")
}
function toStringUser(owneruser,template){
	template=template||"a";
	var result=""
	if(template=="n"||template=="a"){
		result=owneruser.FirstName+" "+owneruser.LastName;
		if(result.trim().length==0){
			console.log("checking user phones "+owneruser.Phone+" "+phones[owneruser.Phone])
			if(phones[owneruser.Phone])
				result=phones[owneruser.Phone].Name||"";
		}	
	}
	if(template=="a")
		result+=" ";
	
	if(template=="p"||template=="a"||result.trim().length==0)
		result+=("0"+owneruser.Phone).toPersianDigit();
	return result;
}
function getUserPic(user){
	
	if(phones[user.Phone]&&phones[user.Phone].Photo){
		console.log("checking photo phones "+user.Phone+" "+phones[user.Phone].Photo)
		return phones[user.Phone].Photo;
	}
	
	return "img/user/"+(user.Male?"":"fe")+"male.png";
}
Template7.registerHelper('groups', function (id,property,topersian) {
	if(topersian=="persian")
		return (groups[id][property]+'').toPersianDigit();
	return groups[id][property];
});
Template7.registerHelper('users', function (id,property,topersian) {
	id=id||me();
	if(topersian=="persian")
		return (users[id][property]+'').toPersianDigit();
	return users[id][property];
});
Template7.registerHelper('me', function (property,topersian) {
	if(topersian=="persian")
		return (users[me()][property]+'').toPersianDigit();
	return users[me()][property];
});
//toPersianDigit
Template7.registerHelper('pd', function (property) {
    return (property+'').toPersianDigit();
});
Template7.registerHelper('money', function (property) {
	if(property==undefined)
		return '';
	if(property>0)
		return ('+'+property).toPersianDigit();
    return (property+'').toPersianDigit();
});
	
var myApp = new Framework7({
 
 template7Pages: true,	
    modalTitle: 'دنگ ابری',
	modalButtonOk: 'تایید',
	modalButtonCancel:'لغو',
	modalPreloaderTitle:'در حال بارگذاری',
	init: false,
//	cache:false,
	//pushState: isDesktop(),
    animateNavBackIcon: true,
	//tapHold:true,
	//tapHoldPreventClicks:true,
	sortable:false,
	swipeout:false,
	swipePanelOnlyClose:true,
	preroute: function (view, options) {
        if (!isUserLogin()&&needLogin(options.url)) {
            view.router.loadPage('login.html'); //load another page with auth form
            return false; //required to prevent default router action
        }
			
		if(isUserLogin()&&users&&users[me()]&&options.url&&(options.url.indexOf("editname")<0)){
			isvalid=true;
			if(!users[me()].FirstName)
				isvalid=false;
			if(!users[me()].LastName)
				isvalid=false;
			if(!isvalid){
				view.router.loadPage('editname.html'); //load another page with auth form
				return false; //required to prevent default router action
			}
			
		}
    },
	
});
  

function onDeviceReady() {
	initPhones().then(function(){}).catch(function(){console.error("contact init error");});
	document.addEventListener("backbutton", function (e) { 
			
		e.preventDefault(); 
		
		modals=$$(".modal-info");
		if(modals.length){
			myApp.closeModal('.modal-info');
			return ;
		}
		
		//if(keyboard is open){
			//close keyboard
		//}
		
		if (Keyboard.isVisible) {
			Keyboard.hide();
			return;
		}	
		
		if(myApp.views[0]&&myApp.views[0].activePage&&myApp.views[0].activePage.name=="dash"){
			if(confirm("آیا میخواهید خارج شوید؟"))
				navigator.app.exitApp();
			return;
		}
		$$(".back").click();
		
	}, false ); 
} 
document.addEventListener("deviceready", onDeviceReady, false); 
  
//document.addEventListener("deviceready", function () {
  //      document.addEventListener("backbutton", function (e) {
//            e.preventDefault();
    //    }, false );
//}, false);
    
	
//};


	
function init_updateTransactionList(virtualList,groupid){
	lastId=0;
	if(virtualList.items.length)
		lastId=virtualList.items[0].Id;
	console.log("lastId="+lastId);
	if(lastId==0)
		virtualList.deleteAllItems();
	dbserver.Transactions.query().filter().execute().then(function(results){
		
		for (var i = 0; i < results.length; i++) {
			
			transaction=results[i];
			if(transaction.GroupId!=groupid)
				continue;
			if(lastId>=transaction.Id)
				continue;
			if(groups[groupid].Status!=1)
				continue;
			item={
					Id:transaction.Id,
					TransactionId:transaction.Id,
					Type:transaction.Type,
					Description: transaction.Description,
					Group:groups[transaction.GroupId].Name,
					GroupId:transaction.GroupId,
					DateTimeFa:formatDate(persianDate.fromLong(transaction.DateTimeFa),true),
					Amount:transaction.Amount
				};
			virtualList.prependItem(item);
		}		
		if(!virtualList.items.length)
			$$('.searchbar-not-found').show();
		else
			$$('.searchbar-not-found').hide();
	
		myApp.pullToRefreshDone();
	});
}
function init_updateGroupsList(virtualList){
	lastId=0;
	if(virtualList.items.length)
		lastId=virtualList.items[0].Id;
	console.log("lastId="+lastId);
	if(lastId==0)
		virtualList.deleteAllItems();
	dbserver.Groups.query().filter().execute().then(function(results){
		
		for (var i = 0; i < results.length; i++) {
			
			res=results[i];
			if(lastId>=res.Id)
				continue;
			if(res.Status!=1)
				continue;
			transaction=transactions[res.TransactionId];
			item={
					Id:res.Id,
					MyCash: memberships[res.Id]?memberships[res.Id][me()].Cash:'',
					Name:res.Name,
					MySettingsFlags:res.MySettingsFlags,
					Permission:memberships[res.Id]?memberships[res.Id][me()].Permission:3,
					GroupPic:((res.Id%4)+1)+""
				};
				
			virtualList.prependItem(item);
		}		
		if(!virtualList.items.length)
			$$('.searchbar-not-found').show();
		else
			$$('.searchbar-not-found').hide();

		myApp.pullToRefreshDone();
	});
}
function init_updateUserTransacrionList(userid,groupid,virtualList){
	lastId=0;
	if(virtualList.items.length)
		lastId=virtualList.items[0].Id;
	if(lastId==0)
		virtualList.deleteAllItems();
	
	console.log("lastId="+lastId);

	dbserver.TransactionDetails.query().filter('UserId',userid).execute().then(function(results){
		for (var i = 0; i < results.length; i++) {
			res=results[i];
			if(lastId>=res.Id)
				continue;
			
			transaction=transactions[res.TransactionId];
			if(groupid&&transaction.GroupId!=groupid)
				continue;
			if(groups[transaction.GroupId].Status!=1)
				continue;
			item={
					TransactionId:res.TransactionId,
					Id:res.Id,
					Amount: res.Amount,
					Type:transaction.Type,
					Description: transaction.Description,
					Group:groups[transaction.GroupId].Name,
					GroupId:transaction.GroupId
				};
				
			virtualList.prependItem(item);
		}
		if(!virtualList.items.length)
			$$('.searchbar-not-found').show();
		else
			$$('.searchbar-not-found').hide();

		myApp.pullToRefreshDone();
	});
}
function reinitTransactionsCache2(){
	return new Promise(function(onready){
		console.log("re-initing Transactions Cache");
		dbserver.Transactions.query().filter().execute().then(function(results){
			for (var i = 0; i < results.length; i++) {
				transactions[results[i].Id]=results[i];
			}
			console.log("	re-inited Transactions Cache");
			onready();
		});
	});
}
function reinitTransactionsCache(onready){
	console.log("re-initing Transactions Cache");
	onready=onready||function(){};
	dbserver.Transactions.query().filter().execute().then(function(results){
		for (var i = 0; i < results.length; i++) {
			transactions[results[i].Id]=results[i];
		}
		onready();
	});
}
function reinitUsersCache2(){
	return new Promise(function(onready){
		console.log("re-initing Users Cache");
		dbserver.Users.query().filter().execute().then(function(results){
			for (var i = 0; i < results.length; i++) {
				users[results[i].Id]=results[i];
			}
			console.log("	re-inited Users Cache");
			onready();
		});
	});
}
function reinitUsersCache(onready){
	console.log("re-initing Users Cache");
	onready=onready||function(){};
	dbserver.Users.query().filter().execute().then(function(results){
		for (var i = 0; i < results.length; i++) {
			users[results[i].Id]=results[i];
		}
		onready();
	});
}
function reinitGroupsCache2(){
	return new Promise(function(onready){
		console.log("re-initing Groups Cache");
		dbserver.Groups.query().filter().execute().then(function(results){
			for (var i = 0; i < results.length; i++) {
				groups[results[i].Id]=results[i];
			}
			console.log("	re-inited Groups Cache");
			onready();
		});
	});
	
}
function reinitGroupsCache(onready){
	console.log("re-initing Groups Cache");
	onready=onready||function(){};
	dbserver.Groups.query().filter().execute().then(function(results){
		for (var i = 0; i < results.length; i++) {
			groups[results[i].Id]=results[i];
		}
		onready();
	});
}
function reinitMembershipsCache2(){
//	onready=onready||function(){};
	return new Promise(function(onready){
		console.log("re-initing Memberships Cache");
		dbserver.Memberships.query().filter().execute().then(function(results){
			for (var i = 0; i < results.length; i++) {
				if(!memberships[results[i].GroupId])
					memberships[results[i].GroupId]={};
				memberships[results[i].GroupId][results[i].UserId]=results[i];
			}	
			console.log("	re-inited Memberships Cache");
			onready();
		});
	});
}
function reinitMembershipsCache(onready){
	console.log("re-initing Memberships Cache");
	onready=onready||function(){};
	dbserver.Memberships.query().filter().execute().then(function(results){
		for (var i = 0; i < results.length; i++) {
			if(!memberships[results[i].GroupId])
				memberships[results[i].GroupId]={};
			memberships[results[i].GroupId][results[i].UserId]=results[i];
		}	
		onready();
	});
}
function reinitCache2(){	
	return Promise.all([
						reinitGroupsCache2(),
						reinitTransactionsCache2(),
						reinitUsersCache2(),
						reinitMembershipsCache2(),
					
						]);
}
function reloadAll(){	
	return Promise.all([
						updateTransactions2(),
						updateFriends2(),
						updateGroups2(),
						updateMemberships2()]);
}
function reinitCache(onready){
	onready=onready||function(){};
	reinitGroupsCache(function(){
		reinitTransactionsCache(function(){
			reinitUsersCache(function(){
				reinitMembershipsCache(onready)
			});
		});
	});
}


function dbinit(){
	console.log("initing db");
	//window.shimIndexedDB && window.shimIndexedDB.__useShim();
	db.open( {
		server: 'clouddong',
		version: 10,
		schema: {
			Users: {
				key: { keyPath: 'Id'},
				// Optionally add indexes
				indexes: {
					Phone: { unique: true },
				}
			},
			Groups:{
				key: { keyPath: 'Id'},
				// Optionally add indexes
				indexes: {
				}
			},
			Transactions:{
				key: { keyPath: 'Id'},
				// Optionally add indexes
				indexes: {
					GroupId:{},
					
				}
			},
			TransactionDetails:{
				key: { keyPath: 'Id'},
				// Optionally add indexes
				indexes: {
					UserId:{},
					TransactionId:{},
					
				}
			},
			Memberships:{
				key: { keyPath: 'Id'},
				// Optionally add indexes
				indexes: {
					UserId:{},
					GroupId:{},
					
				}
			}
		}
	} ).then( function ( s ) {
		dbserver = s	
		//reinitCache(pageReady);
		reinitCache2().then(pageReady);
		
	} );
}


function me(){
	return parseInt(window.localStorage['userid'],10);
}
function array2form(data,name,arr){
	for(i=0;i<arr.length;i++){
		data[name+"["+i+"]"]=arr[i];
	}
}
//unused
function SetPermission(indata){
	return post2({
		path:"Groups/SetPermission/",
		data:indata,
	}).then(function(data){
		return updateMemberships2();
	}).catch(function(data){
		console.error(JSON.stringify(data));		
		myApp.alert("خطا ارتباط با سرور برقرار نشد.");
	});		       
}
function MakeTransaction2(indata){
	array2form(indata,"Transactions",indata.Transactions);
	delete indata.Transactions;
	
	return post2({
		path:"Groups/MakeTransaction/",
		data:indata,
	}).then(function(){
		updateTransactions2();
	}).catch(function(data){
		console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
	});		       
}
function MakeTransaction(indata,onsuccess){
	onsuccess=onsuccess||function(data){updateTransactions();};
	
	array2form(indata,"Transactions",indata.Transactions);
	delete indata.Transactions;
	
	post({
			path:"Groups/MakeTransaction/",
			data:indata,
			success: onsuccess,
			error: function(data){
				myApp.hideIndicator();
				console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
			}
	});		       
}
//unused
function AddUserToGroup(indata){
	post({
		path:"Groups/AddUser/",
		data:indata,
		success: function(data){
				updateMemberships();
				dbserver.Users.update(data.Output).then( function ( item ) {
					// item stored
					console.log("user stored:");
					console.log(item);
					
				});
		},
		error: function(data){
			console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
		}
});		       
}
//unused
function CreateGroup(indata){
	post({
		path:"Groups/Create/",
		data:indata,
		success: function(data){
				dbserver.Groups.update(data.Output).then( function ( item ) {
					// item stored
					console.log("group stored:");
					console.log(item);
					
				});
		},
		error: function(data){
			console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
		}
	});		       
}
function updateFriends(onsuccess){
	onsuccess=onsuccess||function(){};
	post({
		path:"users/getfriends/",
		data:{ },
		success: function(data){
			allasync=[];
			for(i=0;i<data.Output.length;i++)
				allasync.push(dbserver.Users.update(data.Output[i]).then( function ( item ) {
					// item stored
					console.log("user stored:");
					console.log(item);
					
				}));
			Promise.all(allasync).then(function() {
				console.log("reinitMembershipsCache");
				reinitUsersCache(onsuccess);
			});
		},
		error: function(data){
			console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
		}
	});		       
}
function updateGroups(onsuccess){
	onsuccess=onsuccess||function(){};
	post({
		path:"groups/getall/",
		data:{ },
		success: function(data){
			allasync=[];
			for(i=0;i<data.Output.length;i++)
				allasync.push(dbserver.Groups.update(data.Output[i]).then( function ( item ) {
					// item stored
					console.log("group stored:");
					console.log(item);
					
				}));
			Promise.all(allasync).then(function() {
				console.log("reinitGroupsCache");
				reinitGroupsCache(onsuccess);

			});
		},
		error: function(data){
			console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
		}
	});		       
}
function updateMemberships(onsuccess){
	onsuccess=onsuccess||function(){};
	post({
		path:"groups/GetMemberships/",
		data:{ },
		success: function(data){
			allasync=[];						
			for(i=0;i<data.Output.length;i++)
				allasync.push(dbserver.Memberships.update(data.Output[i]).then( function ( item ) {
					// item stored
					console.log("membership stored:");
					console.log(item);
				}).catch(function(item,a){
					console.error(item);
					console.error(a);
				}));
				
			Promise.all(allasync).then(function() {
				console.log("reinitMembershipsCache");
				reinitMembershipsCache(onsuccess);

			});		
		},
		error: function(data){
			console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
		}
	});		       
}
function updateTransactions(onsuccess){
	onsuccess=onsuccess||function(){};
	laststartid=window.localStorage['laststartid']||0;	
	post({
		path:"groups/GetAllTransactions/",
		data:{ },
		success: function(data){
			allasync=[];
			for(i=0;i<data.Output.Transactions.length;i++){
				var data2=data.Output.Transactions[i];
				for(j=0;j<data2.TransactionDetails.length;j++)
					allasync.push(dbserver.TransactionDetails.update(data2.TransactionDetails[j]).then( function ( item ) {
					// item stored
					console.log("TransactionDetails stored:");
					console.log(item);
					
					}));
				delete data2.TransactionDetails;
				allasync.push(dbserver.Transactions.update(data2).then( function ( item ) {
				// item stored
				console.log("Transaction stored:");
				console.log(item);
				
				}));
			}
			
			Promise.all(allasync).then(function() {
				if(data.Output.Transactions.length)
					window.localStorage['laststartid']=data.Output.Transactions[data.Output.Transactions.length-1].Id;
				reinitTransactionsCache(onsuccess);
			});
				
		},
		error: function(data){
			console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
		}
	});		       
}
function updateFriends2(){
	
	return 	post2({
			path:"users/getfriends/",
		}).then(function(data){
			console.log("users:",data);
			allasync=[];
			for(i=0;i<data.Output.length;i++)
				allasync.push(dbserver.Users.update(data.Output[i]).then( function ( item ) {
					// item stored
					console.log("user stored:");
					console.log(item);
					
				}));
			return Promise.all(allasync).then(function() {
				return reinitUsersCache2();
			});
		}).catch(function(data){
			console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
		});
}
function updateGroups2(){
	
	return post2({
		path:"groups/getall/",
	}).then(function(data){
		allasync=[];
		for(i=0;i<data.Output.length;i++)
			allasync.push(dbserver.Groups.update(data.Output[i]).then( function ( item ) {
				console.log("group stored:");
				console.log(item);
			}));
		return Promise.all(allasync).then(function() {
			return reinitGroupsCache2();
		});
	}).catch(function(data){
		console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
	});
			       
}
function updateMemberships2(){
	
	return post2({
		path:"groups/GetMemberships/",
	}).then(function(data){
		allasync=[];						
		for(i=0;i<data.Output.length;i++)
			allasync.push(dbserver.Memberships.update(data.Output[i]).then( function ( item ) {
				// item stored
				console.log("membership stored:");
				console.log(item);
			}).catch(function(item,a){
				console.error(item);
				console.error(a);
			}));
			
		return Promise.all(allasync).then(function() {
			return reinitMembershipsCache2();
		});		
	}).catch(function(data){
		console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
	});
	       
}
function updateTransactions2(){
	var laststartid=window.localStorage['laststartid']||0;	
	return post2({
		path:"groups/GetAllTransactions/",
	}).then(function(data){
		var allasync=[];
		for(var i=0;i<data.Output.Transactions.length;i++){
			var data2=data.Output.Transactions[i];
			var cost=0;
			for(var j=0;j<data2.TransactionDetails.length;j++){
				if(data2.TransactionDetails[j].Amount>0)
					cost+=data2.TransactionDetails[j].Amount;
				allasync.push(dbserver.TransactionDetails.update(data2.TransactionDetails[j]).then( function ( item ) {
					console.log("TransactionDetails stored:");
					console.log(item);				
				}));
			}
			delete data2.TransactionDetails;
			data2.Amount=cost;
			allasync.push(dbserver.Transactions.update(data2).then( function ( item ) {	
				console.log("Transaction stored:");
				console.log(item);
			}));
		}
		
		return Promise.all(allasync).then(function() {
			if(data.Output.Transactions.length)
				window.localStorage['laststartid']=data.Output.Transactions[data.Output.Transactions.length-1].Id;
			return reinitTransactionsCache2();
		});
			
	}).catch(function(data){
		console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
	});		       
}
function post2(options){
	var path=options.path;
	var data=options.data||{};
	
	if(window.localStorage['sessionkey'])
		data.SessionKey=window.localStorage['sessionkey'];	
	
	return new Promise(function(success,error){
	
	//success=options.success||function(res){alert(res);};
	//error=options.error||function(res){alert(res);};
	$$.ajax({
			type: "POST",
			url: "http://clouddong.ml/api/"+path,
			//url: "http://localhost:3400/api/"+path,
			data: data,
			dataType:'json',
			success: function(res, textStatus, jqXHR ){
				myApp.hideIndicator();
				if(res.Type==1)
					success(res);
				else{
					myApp.alert("خطای شماره :"+res.Type);
					//error(res);	
				}
				
			},
			error: function(xhr, ajaxOptions, thrownError){
				console.error(JSON.stringify(xhr)+ JSON.stringify(ajaxOptions)+ JSON.stringify(thrownError));
				if(xhr.status==401)
					window.localStorage['sessionkey']="";
				myApp.hideIndicator();
				if(xhr.status==500)
					myApp.alert("خطا در سمت سرور.");
				error({xhr:xhr, ajaxOptions:ajaxOptions, thrownError:thrownError});	
			},
			ajaxComplete:function(xhr, status){
				myApp.hideIndicator();
			},
			contentType:"application/x-www-form-urlencoded"
		});		
	});
}
function post(options){
	var path=options.path;
	var data=options.data||{};
	
	if(window.localStorage['sessionkey'])
		data.SessionKey=window.localStorage['sessionkey'];	
	
	var success=options.success||function(res){myApp.alert(res);};
	var error=options.error||function(res){myApp.alert(res);};
	$$.ajax({
			type: "POST",
			url: "http://clouddong.ml/api/"+path,
			//url: "http://localhost:3400/api/"+path,
			data: data,
			dataType:'json',
			success: function(res){
				if(res.Type==1)
					success(res);
				else
					error(res);				
			},
			error: function(res,status){
				console.error(status);
				console.error(res);
				if(res.status==401)
					window.localStorage['sessionkey']="";
				error(res);	
			},
			contentType:"application/x-www-form-urlencoded"
		});		
}
function validatePhone(phone) {
    var re = /^(۰۹[۰-۴][۰-۹]{8}|09[0-4][0-9]{8})$/i;
    return re.test(phone);
}
function validateEmail(email) {
    var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    return re.test(email);
}
function validateDateTimeFa(datetimefa) {
	var re = /^(13[0-9]{12})$/i;
    return re.test(datetimefa);
}
function isUserLogin(){
	if (window.localStorage['sessionkey'])
		return true;
	return false;
}
notneedloginpages=['login','enterOTP'];
function needLogin(page){
	if(!page)
		return true;
	for(i=0;i<notneedloginpages.length;i++)
		if(page.indexOf(notneedloginpages[i])>=0)
			return false;
	
	return true;
}
function initPhones(){
	return new Promise(function(success,error){
		console.log("initing Phones");
		if(!navigator.contacts){
			success();
			return;
		}
		
		
		var options = new ContactFindOptions();
			options.filter="";
			options.multiple = true;
			var filter = ['displayName', 'name'];
		
		navigator.contacts.find(filter, function(contacts) {	
			for (var i = 0; i < contacts.length; i++) {
				if(contacts[i].phoneNumbers)
					for (var j=0;j<contacts[i].phoneNumbers.length;j++){
						var phonestr=contacts[i].phoneNumbers[j].value.trim().replace("+98","");
						var phone=0;
						for(var k=0;k<phonestr.length;k++)
							if(phonestr[k]>='0'&&phonestr[k]<='9')
								phone=phone*10+parseInt(phonestr[k]);
						
						if(validatePhone('0'+phone)){
							var photo="";
							if(contacts[i].photos&&contacts[i].photos.length)
								photo=contacts[i].photos[0].value;
							phones[phone]={
								Name:contacts[i].displayName,
								Photo:photo
							};
				//			console.log(phone+" "+phones[phone]);
						}//else
					//		console.log(phonestr);
					}
				
			}
			success();
			//callback();
		}, function(contactError) {
			myApp.alert('onError! contacts');
			error(contactError);
		}, options);
	
	});
}
function pageReady(){

// Add main view
var mainView = myApp.addView('.view-main', {
    // Enable Dynamic Navbar for this view
    dynamicNavbar: true,
	
    preloadPreviousPage: false
});

// Show/hide preloader for remote ajax loaded pages
// Probably should be removed on a production/local app
$$(document).on('ajaxStart', function (e) {
    myApp.showIndicator();
});
$$(document).on('ajaxComplete', function () {
    myApp.hideIndicator();
});

if (!(window.localStorage['intro'])) {
	//mainView.loadPage('intro.html');
}
if (!(window.localStorage['sessionkey'])) {
	//mainView.loadPage('login.html');
}

myApp.onPageBack('home',function (page) {
  console.log(page.name + ' initialized'); 
  mainView.loadPage('dash.html');
});
myApp.onPageInit('home',function (page) {
  //console.log(page.name + ' initialized'); 
   //mainView.loadPage('dash.html');
   
});
mainView.router.loadPage('dash.html');


/* ===== Login screen page events ===== */
myApp.onPageInit('login', function (page) {
    $$(page.container).find('#requestOTP').on('click', function () {
        var phone = $$(page.container).find('input[name="phone"]').val();
		if(validatePhone(phone))
			post({
				path:"users/createotp/",
				data:{ Phone: phone},
				success: function(data){
					myApp.alert(data.Message);
					mainView.loadPage('enterOTP.html?phone='+phone);
				},
				error: function(data){
					console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
				}
			});		       
		else
			myApp.alert("شماره وارد شده صحیح نیست.");
    });
});

myApp.onPageInit('newTransaction', function (page) {
	
	var groupid=page.query.groupid;
	var defaultvalue = persianDate();
	var template='<li><label class="label-checkbox item-content">'+
			'<input type="checkbox" class="users-checkbox" value="{{UserId}}">'+
			'<div class="item-media"><i class="icon icon-form-checkbox"></i></div>'+
              '<div class="item-inner">'+
                //'<div class="item-title label">{{UserName}}</div>'+
                //'<div class="item-input">'+
					'<div class="row">'+
						'<div class="col-50">{{UserName}}</div>'+
						'<div class="col-25"><input type="number" class="cost" placeholder="دنگ"  id="Cost{{UserId}}" data-userid="{{UserId}}" /></div>'+
						'<div class="col-25"><input type="number" type="calculator" class="payment" placeholder="پرداختی" id="Payment{{UserId}}" data-userid="{{UserId}}" /></div>'+
					'</div>'+
                //'</div>'+
              '</div>'+
            '</label></li>';
	createPicker('#DateTimeFa','#DateTimeFaDisplay',defaultvalue,true,true);
	// Inline date-time
	var compiledTemplate = Template7.compile(template);
	var target=$$("#userPayments");
	var payemntsitem="";
	for (var userid in memberships[groupid]){
		var username=toStringUser(users[userid],'n');
		
		target.prepend(compiledTemplate({
			UserName:username,
			UserId:userid
		}));
	} 	
	
	var recalculateTotalCost=function (e) { 
		var sum=0;
		$$(".cost").each(function(i,n){
			var val=$$(n).val()||0;
			var intval=parseInt(val,10);
			//console.log(val +" "+intval);
			if(intval!=val||intval<=0){
				$$(n).val('');
				val=0;
			}
			sum += intval; 
		});
		$$("#sumCost").html((sum+'').toPersianDigit());
	};
	$$('.cost').on('keyup keydown change', recalculateTotalCost);	
    $$('.payment').on('keyup keydown change', function (e) { 
		var sum=0;
		$$(".payment").each(function(i,n){
			var val=$$(n).val()||0;
			var intval=parseInt(val,10);
			//console.log(val +" "+intval);
			if(intval!=val||intval<=0){
				$$(n).val('');
				val=0;
			}			
			sum += intval; 
		});
		$$("#sumPayment").html((sum+'').toPersianDigit());
	});	
	//enableScoralToInput();
	$$(page.container).find('#equalDivide').on('click', function () {
		var sum=0;
		$$(".payment").each(function(i,n){
			var val=$$(n).val()||0;
			var intval=parseInt(val,10);
			if(intval!=val||intval<=0)
				return;
			sum += intval; 
		});
		if(sum==0){
			myApp.alert("لطفا پرداختی ها را وارد کنید.");
			return;
		}
		var checkeduser=$$(".users-checkbox:checked");
		if(checkeduser.length==0){
			myApp.alert("لطفا افراد مورد نظر را انتخاب کنید.");
			return;
		}
			
		var dong=Math.floor(sum/checkeduser.length);
		checkeduser.each(function(i,v){
			
			if(i==checkeduser.length-1)
				dong=sum;
			$$("#Cost"+$$(v).val()).val(dong);
			sum-=dong;
			
		});
		recalculateTotalCost();
	});
	
	
	
	var list=["Cost","Payment"];
	for (var userid in memberships[groupid]){
		for (var item in list)
			myApp.keypad({
				cssClass:"modal-info",
				input: '#'+list[item]+userid,
				type: 'calculator',
				valueMaxLength: 8,
				dotButton: false,
				onlyOnPopover:true,
				toolbar:false,
				formatValue:function (p, value){
					var val=Math.floor(value);
					if(val<0)
						val=-val;
					return val;
				}
		});
	}
	/*
	myApp.keypad({
		input: '.payment',
		type: 'calculator',
		valueMaxLength: 8,
		dotButton: false,
		onlyOnPopover:true,
		toolbar:false,
		formatValue:function (p, value){
			val=Math.floor(value);
			if(val<0)
				val=-val;
			return val;
		}
		
	});
	*/
	/*
	var myKeypad = myApp.keypad({
		input: '.payment',
		type: 'calculator',
		valueMaxLength: 8,
		dotButton: false,
		onlyOnPopover:true,
	});
	*/
  $$(page.container).find('#submitTransaction').on('click', function () {
	var Description=$$(page.container).find('#Description').val();
	var Type=$$(page.container).find('#Type').val();
	var DateTimeFa=$$(page.container).find('#DateTimeFa').val();
	
	if(!Description){myApp.alert("توضیحات را درست وارد کنید");return;}
	if(!Type){myApp.alert("نوع تراکنش را درست وارد کنید");return;}
	if(!validateDateTimeFa(DateTimeFa)){myApp.alert("زمان را درست وارد کنید");return;}
	var Transactions=[];
	
		var sumPayment=0;
		$$(".payment").each(function(i,n){
			var val=$$(n).val()||0;
			var intval=parseInt(val,10);
			if(intval!=val||intval<=0)
				return;
			Transactions.push([$$(n).attr('data-userid'),intval]);
			sumPayment += intval; 
		});
		if(sumPayment==0){myApp.alert("لطفا پرداختی ها را وارد کنید.");return;}
		var sumCost=0;
		$$(".cost").each(function(i,n){
			var val=$$(n).val()||0;
			var intval=parseInt(val,10);
			if(intval!=val||intval<=0)
				return;
			Transactions.push([$$(n).attr('data-userid'),-intval]);
			sumCost += intval; 
		});
		if(sumCost==0){myApp.alert("لطفا هزینه ها را وارد کنید.");return;	}
		if(sumCost-sumPayment!=0){myApp.alert("جمع پرداختی و هزینه برابر نیست. اختلاف:"+Math.abs(sumCost-sumPayment));	return;	}
			
			
	MakeTransaction2({
		GroupId:groupid,
		Description:Description,Type:Type,DateTimeFa:DateTimeFa,
		Transactions:Transactions
	}).then(function(data){
		myApp.alert("اطلاعات ثبت شد.");
		$$(".back").click();
	});
	
  });
});
myApp.onPageInit('enterOTP', function (page) {
        var phone = page.query.phone;
		$$(page.container).find('#phone').html(""+phone)
		
       $$(page.container).find('#login').on('click', function () {
		   var otp = $$(page.container).find('input[name="otp"]').val();
		if(validatePhone(phone)&&/^([۰-۹]{4}|[0-9]{4})$/i.test(otp))
			post2({
				path:"users/login/",
				data:{ Phone: phone,OTP:otp},
			}).then(function(data){
					
				if(data.Output.SessionKey){
					window.localStorage['sessionkey']=data.Output.SessionKey;
					window.localStorage['userid']=data.Output.User.Id;
					reloadAll().then(function(){
						mainView.loadPage('dash.html');
					});
					/*
					dbserver.Users.update(data.Output.User).then( function ( item ) {
						console.log("stored:");
						console.log(item);
						updateFriends(function(){
							updateGroups(function(){
								mainView.loadPage('dash.html')
							});
						});
					});
					*/
				}else{
					myApp.alert(data);
				}
			}).catch(function(data){
				myApp.hideIndicator();
				console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");		
			});		       
		else
			myApp.alert("شماره وارد شده صحیح نیست.");
    }); 
    
});
myApp.init();

myApp.onPageInit('group', function (page) {
	$$(page.container).find('#deletegroup').on('click', function () {
		if(!confirm("آیا می خواهید گروه حذف شود؟"))
			return;
		if(!confirm("با این کار امکان بازگشت اطلاعات گروه وجود ندارد.. مطمئنید؟"))
			return;
			
		post2({
			path:'Groups/Delete',
			data:{GroupId:page.query.id}
		}).then(function(data){
			//updateGroups();
			dbserver.Groups.update(data.Output).then( function ( item ) {
				console.log("group stored:");
				console.log(item);
				myApp.alert("گروه حذف شد.");
				mainView.loadPage('groups.html');
			});
			/*updateGroups(function(){
				updateMemberships(function(){
					alert("اطلاعات ثبت شد.");
					mainView.loadPage('groups.html');
				});
			});
			*/
		}).catch(function(data){
			console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
		});
		
					
	});
});
myApp.onPageInit('newGroup', function (page) {
    
  $$(page.container).find('#submitNewGroup').on('click', function () {
	var GroupName=$$(page.container).find('#GroupName').val();
	if(!GroupName){myApp.alert("نام گروه را درست وارد کنید");return;}
	
	post2({
		path:'Groups/Create',
		data:{Name:GroupName}
	}).then(function(data){
		//updateGroups();
		Promise.all([updateGroups2(),updateMemberships2()]).then(function(){
			myApp.alert("اطلاعات ثبت شد.");
			//$$(".back").click();
			mainView.loadPage('groups.html');
		});
		/*updateGroups(function(){
			updateMemberships(function(){
				alert("اطلاعات ثبت شد.");
				mainView.loadPage('groups.html');
			});
		});
		*/
	}).catch(function(data){
		console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
	});
  });
});

myApp.onPageInit('editname', function (page) {
	var BFa=users[me()].BirthdayFa;
	
	var showdefault=true;
	
	if(BFa<13000000){		
		BFa=13700101;
		showdefault=false;
	}
	defaultvalue = persianDate.fromLong(BFa*1000000);	
	createPicker('#BirthDayFa','#BirthDayFaDisplay',defaultvalue,false,showdefault);
	// Inline date-time
    //enableScoralToInput();
  $$(page.container).find('#submitName').on('click', function () {
	var FirstName=$$(page.container).find('#FirstName').val();
	var LastName=$$(page.container).find('#LastName').val();
	var Email=$$(page.container).find('#Email').val();
	var Male=$$(page.container).find('#Gender').val();
	var BirthdayFa=$$(page.container).find('#BirthDayFa').val();
	
	if(!FirstName){myApp.alert("نام را درست وارد کنید");return;}
	if(!LastName){myApp.alert("نام خانوادگی را درست وارد کنید");return;}
	if(!validateEmail(Email)){myApp.alert("ایمیل را درست وارد کنید");return;}
	if(!validateDateTimeFa(BirthdayFa*1000000)){myApp.alert("تاریخ تولد را درست وارد کنید");return;}
	post2({
		path:'users/update',
		data:{FirstName:FirstName,LastName:LastName,Phone:users[me()].Phone,Male:Male,Email:Email,BirthdayFa:BirthdayFa}
	}).then(function(data){
		//updateFriends();
		dbserver.Users.update(data.Output).then(function(){
			reinitUsersCache2().then(function(){
				myApp.alert("اطلاعات ثبت شد.");
				mainView.loadPage('dash.html');
			});
		});
		//mainView.loadPage('dash.html');
	}).catch(function(data){
		console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");	
	});
  });
});
myApp.onPageInit('dash', function (page) {
	//mainView.loadPage('userTransactions.html?userid='+me());
	
});
////////////////////////////////////////////////////////////////////////////////
myApp.onPageInit('userTransactions', function (page) {
	console.log("userTransactions is loading...");
	var userid=parseInt(page.query.userid||me());
	var groupid=parseInt(page.query.groupid);
    var virtualList = myApp.virtualList($$('.userTransactions-list'), {
        items: [],
		//updatableScroll:true,
        searchAll: function (query, items) {
            var found = [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].Description.indexOf(query) >= 0 || query.trim() === '') found.push(i);
            }
            return found; //return array with mathced indexes
        },
        // List item Template7 template
        template: '<li>' +
					'<a href="transaction.html?id={{TransactionId}}" class="item-link item-content">' +
					'<div class="item-media"><img src="img/type/{{Type}}.png" width="44"/></div>'+
                      '<div class="item-inner">' +
                        '<div class="item-title-row">' +
                          '<div class="item-title">{{Description}}</div><div class="item-after" style="direction:ltr;">{{money Amount}} </div>' +
                        '</div>' +
                        '<div class="item-subtitle">گروه {{Group}}</div>' +
                      '</div>' +
                    '</a>' +
                  '</li>',
        // Item height
        height: 80,
    });
    
    var ptrContent = $$(page.container).find('.pull-to-refresh-content');
    // Add 'refresh' listener on it
    ptrContent.on('refresh', function (e) {
		reloadAll().then(function(){init_updateUserTransacrionList(userid,groupid,virtualList);});
		/*
		updateTransactions(function(){
			updateFriends(function(){
				updateGroups(function(){
					updateMemberships(function(){
						init_updateUserTransacrionList(userid,virtualList);
					});
				});
			});
		});
		*/
    });
	init_updateUserTransacrionList(userid,groupid,virtualList);
		
});
myApp.onPageInit('showTransactions', function (page) {
	var groupid=page.query.groupid;
    var virtualList = myApp.virtualList($$('.showTransactions-list'), {
        items: [],
        searchAll: function (query, items) {
            var found = [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].Description.indexOf(query) >= 0 || query.trim() === '') found.push(i);
            }
            return found; //return array with mathced indexes
        },
        // List item Template7 template
        template: '<li>' +
                    '<a href="transaction.html?id={{TransactionId}}" class="item-link item-content">' +
					'<div class="item-media"><img src="img/type/{{Type}}.png" width="44"/></div>'+
                      '<div class="item-inner">' +
                        '<div class="item-title-row">' +
                          '<div class="item-title">{{Description}}</div><div class="item-after" style="direction:ltr;">{{money Amount}} </div>' +
                        '</div>' +
						'<div class="item-subtitle">{{DateTimeFa}}</div>' +
                      '</div>' +
                    '</a>' +
                  '</li>',
        // Item height
        height: 80,
    });
    
    var ptrContent = $$(page.container).find('.pull-to-refresh-content');
    // Add 'refresh' listener on it
    ptrContent.on('refresh', function (e) {
		updateTransactions2().then(function(){
			init_updateTransactionList(virtualList,groupid);
		});

    });
	init_updateTransactionList(virtualList,groupid);
		
});
////////////////////////////////////////////////////////////////////////////////
myApp.onPageInit('groups', function (page) {
    var virtualList = myApp.virtualList($$('.groups-list'), {
        items: [],
        searchAll: function (query, items) {
            var found = [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].Name.indexOf(query) >= 0 || query.trim() === '') found.push(i);
            }
            return found; //return array with mathced indexes
        },
        // List item Template7 template
        template: '<li>' +
                    '<a href="group.html?id={{Id}}" class="item-link item-content">' +
					  '<div class="item-media"><img src="img/group/{{GroupPic}}.png" width="44"/></div>'+
                      '<div class="item-inner">' +
                        '<div class="item-title-row">' +
                          '<div class="item-title">{{Name}}</div><div class="item-after" style="direction:ltr;">{{money MyCash}} </div>' +
                        '</div>' +
                        '<div class="item-subtitle">&nbsp;</div>' +
                      '</div>' +
                    '</a>' +
                  '</li>',
        // Item height
        height: 80,
    });
    
    var ptrContent = $$(page.container).find('.pull-to-refresh-content');
    // Add 'refresh' listener on it
    ptrContent.on('refresh', function (e) {
		Promise.all([updateGroups2(),updateMemberships2()]).then(function(){
			init_updateGroupsList(virtualList);
		});

    });
	init_updateGroupsList(virtualList);
		
});
myApp.onPageInit('add-member', function (page) {
	
	$$(page.container).find('#GetFromContact').on('click', function () {
		if(!navigator.contacts){
			myApp.alert("مخاطبی یافت نشد.")
			return;
		}
			
		navigator.contacts.pickContact(function(contact){
			console.log('The following contact has been selected:' ,contact);
			var phonestmp=[];
			if(contact.phoneNumbers)
				for(i =0;i<contact.phoneNumbers.length;i++){
					var phonestr=contact.phoneNumbers[i].value.trim().replace("+98","0");
					var phone="";
					for(j=0;j<phonestr.length;j++)
						if(phonestr[j]>='0'&&phonestr[j]<='9')
							phone+=phonestr[j];
					//phone=.replace(" ","").replace(" ","").replace(" ","")
					//replace("-","").trim();
					if(validatePhone(phone))
						phonestmp.push(phone);
					//else
						//alert("incorrect"+phone);
				}
			//alert(phones);
			console.log(phonestmp);
			if(phonestmp.length)
				$$(page.container).find('input[name="phone"]').val(phonestmp[0]);
			else
				myApp.alert("تلفن مجازی یافت نشد.");
		},function(err){
			myApp.alert("اطلاعات دریافت نشد")
		});
	});
	   $$(page.container).find('#َAddMember').on('click', function () {
        var groupid=page.query.groupid;
		var phone = $$(page.container).find('input[name="phone"]').val();
		if(validatePhone(phone))
			post2({
				path:"Groups/AddUser",
				data:{ GroupId:groupid,Phone: phone},
			}).then(function(data){
					//alert(data.Message);
				Promise.all([updateMemberships2(),updateFriends2()]).then(function(){
						myApp.alert("به گروه اضافه شد.");
						mainView.loadPage('group.html?id='+groupid);
					});
				/*updateMemberships(function(){
					updateFriends(function(){
						myApp.alert("به گروه اضافه شد.");
						mainView.loadPage('group.html?id='+groupid);
					});
				});
				*/
				//
			}).catch(function(data){
					console.error(JSON.stringify(data));myApp.alert("خطا ارتباط با سرور برقرار نشد.");
			});		       
		else
			myApp.alert("شماره وارد شده صحیح نیست.");
    });
});
myApp.onPageInit('group-members', function (page) {
	var groupid=page.query.groupid;
	var virtualList = myApp.virtualList($$('.group-membersList'), {
        items: [],
        searchAll: function (query, items) {
            var found = [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].UserName.indexOf(query) >= 0 || query.trim() === '') found.push(i);
            }
            return found; //return array with mathced indexes
        },
        // List item Template7 template
        template: '<li>' +                    
				    '<a href="#" class="item-link item-content user" data-userid="{{UserId}}" data-groupid="{{GroupId}}" data-href="userTransactions.html?userid={{UserId}}&groupid={{GroupId}}">' +
					'<div class="item-media"><img src="{{UserPic}}" width="44"/></div>'+
                      '<div class="item-inner">' +
                        '<div class="item-title-row">' +
                          '<div class="item-title">{{UserName}}</div><div class="item-after" style="direction:ltr;">{{money Amount}} </div>' +
                        '</div>' +
						'<div class="item-subtitle">تلفن: ۰{{pd UserPhone}}</div>'+
                      '</div>' +
					'</a>'+
                  '</li>',
        // Item height
		
        height: 80,
    });
    init_update=function(){
		dbserver.Memberships.query().filter().execute().then(function(results){
			virtualList.deleteAllItems();
			for (var i = 0; i < results.length; i++) {						
				var res=results[i];
				if(res.GroupId!=groupid)
					continue;
				var user=users[res.UserId];
				var item={
						Id:res.Id,
						Amount:  memberships[groupid][user.Id].Cash,
						UserId:user.Id,
						GroupId:groupid,
						
						UserName:toStringUser(user,'n'),
						UserPhone:user.Phone,
						UserPic:getUserPic(user)
					};
						
				virtualList.prependItem(item);
			}
			$$(".user").on('taphold click',function(e){
				e.preventDefault();
				var userid=$$(this).attr('data-userid');
				var groupid=$$(this).attr('data-groupid');
				var target=$$(this).attr('data-href');
				var permission=memberships[groupid][me()].Permission;
				var actionSheetButtons = [
					// First buttons group
					[
						// Group Label
						{
							text: 'لطفا دسترسی فرد را مشخص کنید',
							label: true
						},
						// First button
						{
							text:((permission)==0?'> ':'') +'بدون دسترسی',
							color: 'red',
							onClick: function () {
								SetPermission(userid,groupid,0).then(function(){myApp.alert("با موفقیت انجام شد.");});
							}
						},
						// First button
						{
							text:((permission&1)!=0?'> ':'') +'خواندنی',
							color: 'red',
							onClick: function () {
								SetPermission(userid,groupid,1).then(function(){myApp.alert("با موفقیت انجام شد.");});
							}
						},
						// Another red button
						{
							text: ((permission&2)!=0?'> ':'') +'نوشتنی',
							color: 'blue',
							onClick: function () {
								SetPermission(userid,groupid,3).then(function(){myApp.alert("با موفقیت انجام شد.");});
								
							}
						},
						
					],
					// Second group
					[
					// Another red button
						{
							text: 'مشاهده تراکنش ها',
							color: 'black',
							onClick: function () {
								mainView.loadPage(target);
								
							}
						},
						{
							text: 'انصراف',
							bold: true
						}
					]
				];
				if((permission&4)==0 ||userid==me())
					mainView.loadPage(target);
				else
					myApp.actions(actionSheetButtons);
				
			});
			myApp.pullToRefreshDone();			
		});
	}
	var ptrContent = $$(page.container).find('.pull-to-refresh-content');
    // Add 'refresh' listener on it
    ptrContent.on('refresh', function (e) {
		Promise.all([updateMemberships2(),updateFriends2()]).then(function(){
			init_update();
		});
		/*
		updateFriends(function(){
			updateMemberships(function(){
				init_update();
			});
		});
		*/
    });
	init_update();
});

myApp.onPageInit('transaction', function (page) {
	var transactionId = parseInt(page.query.id);
	var owneruser=users[transactions[transactionId].OwnerUserId];
	
	
	
	var firstrow='<div class="item-media"><img src="img/type/'+transactions[transactionId].Type+'.png" width="44"/></div>'
					+'<div class="item-inner">'
					+'  <div class="item-title-row">'
					+'		<div class="item-title">'+transactions[transactionId].Description+'</div>'
					+'  </div>'
					+'	<div class="item-subtitle">گروه '+groups[transactions[transactionId].GroupId].Name+'</div>'
					+'  <div class="item-subtitle">'+toStringUser(owneruser,'a')+'</div>'
					+'  <div class="item-text">'+formatDate(persianDate.fromLong(transactions[transactionId].DateTimeFa),true)+'</div>'
					+'  <div class="item-subtitle">'+'مبلغ:'+(transactions[transactionId].Amount+'').toPersianDigit()+'</div>'
					+'</div>';
	$$('#firstrow').html(firstrow);
	
    var virtualList = myApp.virtualList($$('.transaction-list'), {
        items: [],
		
        searchAll: function (query, items) {
            var found = [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].User.indexOf(query) >= 0 || query.trim() === '') found.push(i);
            }
            return found; //return array with mathced indexes
        },
        // List item Template7 template
        template: '<li><div class="item-content">' +                    
					'<div class="item-media"><img src="{{UserPic}}" width="44"/></div>'+
                      '<div class="item-inner">' +
                        '<div class="item-title-row">' +
                          '<div class="item-title">{{User}}</div><div class="item-after" style="direction:ltr;">{{money Amount}} </div>' +
                        '</div>' +
	'	<div class="item-subtitle">تلفن: ۰{{pd UserPhone}}</div>'+
                      '</div>' +
                  '</div></li>',
        // Item height
        height: 80,
    });
    
	dbserver.TransactionDetails.query().filter('TransactionId',transactionId).execute().then(function(results){
		for (var i = 0; i < results.length; i++) {						
			var res=results[i];
			var user=users[res.UserId];
			var item={
					Id:res.Id,
					Amount: res.Amount,
					UserId:user.Id,
					User:toStringUser(user,'n'),
					UserPhone:user.Phone,
					UserPic:getUserPic(user)
					
				};
				
			virtualList.prependItem(item);
		}				
	});

});


}
function createPicker(targetvalue,targetdisplay,defaultvalue,showtime,showdefault){
	
	var days={
                values: (function () {
                    var arr = [];
                    for (var i = 1; i <= 31; i++) { arr.push(i); }
                    return arr;
                })(),
				    displayValues: (function () {
                    var arr = [];
                    for (var i = 1; i <= 31; i++) { arr.push((i+'').toPersianDigit()); }
                    return arr;
                })(),
            };
	var months=// Months
            {
                values: (function () {
                    var arr = [];
                    for (var i = 1; i <= 12; i++) { arr.push(i); }
                    return arr;
                })(),
                displayValues: (function () {
                    var arr = [];
                    for (var i = 1; i <= 12; i++) { arr.push(persianDate.monthRange()[i].name.fa); }
                    return arr;
                })(),
                textAlign: 'right'
            };
			// Years
    var years={
                values: (function () {
                    var arr = [];
                    for (var i = 1300; i <= 1394; i++) { arr.push(i); }
                    return arr;
                })(),
				    displayValues: (function () {
                    var arr = [];
                    for (var i = 1300; i <= 1394; i++) { arr.push((i+'').toPersianDigit()); }
                    return arr;
                })(),
            };
            // Space divider
    var divider={
                divider: true,
                content: '&nbsp;&nbsp;'
            };
	var hours=// Hours
            {
                values: (function () {
                    var arr = [];
                    for (var i = 0; i <= 23; i++) { arr.push(i); }
                    return arr;
                })(),
				displayValues: (function () {
                    var arr = [];
                    for (var i = 0; i <= 23; i++) { arr.push((i+'').toPersianDigit()); }
                    return arr;
                })(),
            };
			
            // Divider
    var dividerTime={
                divider: true,
                content: ':'
            };
            // Minutes
	var minutes={
                values: (function () {
                    var arr = [];
                    for (var i = 0; i <= 59; i+=10) { arr.push(i); }
                    return arr;
                })(),
				displayValues: (function () {
                    var arr = [];
                    for (var i = 0; i <= 59; i+=10) { arr.push(((i < 10 ? '0':'')+i).toPersianDigit()); }
                    return arr;
                })(),
            };
	var cols=[days,months,years];
	if(showtime)
		cols=[days,months,years,divider,minutes,dividerTime,hours];
	var defaultValues=[ defaultvalue.getDate(),defaultvalue.getMonth(), defaultvalue.getFullYear(),  defaultvalue.getMinutes()-defaultvalue.getMinutes()%10,defaultvalue.getHours()];
	var pickerInline = myApp.picker({
		cssClass:"modal-info",
        input: targetdisplay,
        convertToPopover:false,
        toolbar: false,
        rotateEffect: true,
        value: defaultValues,
        onChange: function (picker, values, displayValues) {
			
			if(values[1]>6&&values[0]>=31)
				picker.cols[0].setValue(30);
			if(values[1]==12&&values[0]>=30)
				if(!persianDate([values[2]]).isLeapYear())
					picker.cols[0].setValue(29);
			
            //var daysInMonth = persianDate([picker.value[2], picker.value[0]*1 + 1, 0]).getDate();
            //if (values[1] > daysInMonth) {
            //    picker.cols[1].setValue(daysInMonth);
            //}
        },
        formatValue: function (p, values, displayValues) {
			var pd=persianDate([values[2],values[1],values[0]]);
			if(showtime)
				pd=persianDate([values[2],values[1],values[0],values[4],values[3]]);
			$$(targetvalue).val(dateToLong(pd,showtime));
			return formatDate(pd,showtime);
            //return displayValues[0] + ' ' + displayValues[1] + ' ' + displayValues[2]+(showtime?' ساعت '+displayValues[3]+':'+displayValues[4]:'' );
        },
        cols:cols
    });
	pickerInline.setValue(defaultValues, 50);
	if(showdefault){
		var val=dateToLong(defaultvalue,showtime);
		var valDisp=formatDate(defaultvalue,showtime);
		$$(targetvalue).val(val);
		$$(targetdisplay).val(valDisp);
	}

	if(isDesktop())
		reloadAll();
}

dbinit();
//pageReady();

function enableScoralToInput(){
	 $$("input").focus(function(e) {
		var scrollTo = $$(this);
		var container=$$('.list-block');
		setTimeout((function() {
			$$('.page-content').scrollTop(scrollTo.offset().top - container.offset().top + container.scrollTop(),100);
			
		}), 500);
	});
}
function refresh(){
	myApp.pullToRefreshTrigger(".pull-to-refresh-content");
}