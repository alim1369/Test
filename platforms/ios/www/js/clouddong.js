// Expose Internal DOM library
var $$ = Dom7;
var dbserver;
var transactions={};
var groups={};
var users={};

var memberships={};

function formatDate(pd,hastime){
	if(hastime)
		return pd.format("dddd DD MMMM YYYY ساعت H:mm")
	return pd.format("dddd DD MMMM YYYY")
}
Template7.registerHelper('groups', function (id,property,topersian) {
	if(topersian=="persian")
		return (groups[id][property]+'').toPersianDigit();
	return groups[id][property];
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
	pushState: true,
    animateNavBackIcon: true,
	tapHold:true,
	sortable:false,
	swipeout:false,
	swipePanelOnlyClose:true,
	preroute: function (view, options) {
        if (!isUserLogin()&&needLogin(options.url)) {
            view.router.loadPage('login.html'); //load another page with auth form
            return false; //required to prevent default router action
        }
    },
	
});
  
document.addEventListener("deviceready", function () {
        document.addEventListener("backbutton", function (e) {
            e.preventDefault();
        }, false );
}, false);
    
function initorupdateTransactionList(virtualList,groupid){
	lastId=0;
	if(virtualList.items.length)
		lastId=virtualList.items[0].Id;
	console.log("lastId="+lastId);
	
	dbserver.Transactions.query().filter().execute().then(function(results){
		for (var i = 0; i < results.length; i++) {
			
			transaction=results[i];
			if(transaction.GroupId!=groupid)
				continue;
			if(lastId>=transaction.Id)
				continue;
			item={
					TransactionId:transaction.Id,
					Type:transaction.Type,
					Description: transaction.Description,
					Group:groups[transaction.GroupId].Name,
					GroupId:transaction.GroupId,
					DateTimeFa:formatDate(persianDate.fromLong(transaction.DateTimeFa),true),
					Amount:''
				};
			virtualList.prependItem(item);
		}		

			myApp.pullToRefreshDone();
		});
}
function initorupdateGroupsList(virtualList){
	lastId=0;
	if(virtualList.items.length)
		lastId=virtualList.items[0].Id;
	console.log("lastId="+lastId);
	
	dbserver.Groups.query().filter().execute().then(function(results){
		for (var i = 0; i < results.length; i++) {
			
			res=results[i];
			if(lastId>=res.Id)
				continue;
			transaction=transactions[res.TransactionId];
			item={
					Id:res.Id,
					MyCash: memberships[res.Id][me()].Cash,
					Name:res.Name,
					MySettingsFlags:res.MySettingsFlags,
					GroupPic:((res.Id%4)+1)+""
				};
				
			virtualList.prependItem(item);
		}		

			myApp.pullToRefreshDone();
		});

	

}
function initorupdateDashList(virtualList){
	lastId=0;
	if(virtualList.items.length)
		lastId=virtualList.items[0].Id;
	console.log("lastId="+lastId);

	dbserver.TransactionDetails.query().filter('UserId',me()).execute().then(function(results){
		for (var i = 0; i < results.length; i++) {
			res=results[i];
			if(lastId>=res.Id)
				continue;
			transaction=transactions[res.TransactionId];
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
			myApp.pullToRefreshDone();
		});



}
function reinitTransactionsCache(onready){
	onready=onready||function(){};
	dbserver.Transactions.query().filter().execute().then(function(results){
		for (var i = 0; i < results.length; i++) {
			transactions[results[i].Id]=results[i];
		}
		onready();
	});
}
function reinitUsersCache(onready){
	onready=onready||function(){};
	dbserver.Users.query().filter().execute().then(function(results){
		for (var i = 0; i < results.length; i++) {
			users[results[i].Id]=results[i];
		}
		onready();
	});
}
function reinitGroupsCache(onready){
	onready=onready||function(){};
	dbserver.Groups.query().filter().execute().then(function(results){
		for (var i = 0; i < results.length; i++) {
			groups[results[i].Id]=results[i];
		}
		onready();
	});
}
function reinitMembershipsCache(onready){
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
	window.shimIndexedDB && window.shimIndexedDB.__useShim();
	db.open( {
		server: 'clouddong',
		version: 1,
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
		reinitCache(pageReady);
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
	post({
				path:"Groups/SetPermission/",
				data:indata,
				success: function(data){
					updateMemberships();
				},
				error: function(data){
					alert(JSON.stringify(data));
				}
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
					alert(JSON.stringify(data));
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
			alert(JSON.stringify(data));
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
			alert(JSON.stringify(data));
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
			alert(JSON.stringify(data));
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
			alert(JSON.stringify(data));
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
			alert(JSON.stringify(data));
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
			alert(JSON.stringify(data));
		}
	});		       
}
function post(options){
	path=options.path;
	data=options.data||{};
	
	if(window.localStorage['sessionkey'])
		data.SessionKey=window.localStorage['sessionkey'];	
	
	success=options.success||function(res){alert(res);};
	error=options.error||function(res){alert(res);};
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
					alert(data.Message);
					mainView.loadPage('enterOTP.html?phone='+phone);
				},
				error: function(data){
					alert(JSON.stringify(data));
				}
			});		       
		else
			alert("شماره وارد شده صحیح نیست.");
    });
});

myApp.onPageInit('newTransaction', function (page) {
	groupid=page.query.groupid;
	defaultvalue = persianDate();
	template='<li><label class="label-checkbox item-content">'+
			'<input type="checkbox" class="users-checkbox" value="{{UserId}}">'+
			'<div class="item-media"><i class="icon icon-form-checkbox"></i></div>'+
              '<div class="item-inner">'+
                '<div class="item-title label">{{UserName}}</div>'+
                '<div class="item-input">'+
					'<div class="row">'+
						'<div class="col-50"><input type="number" class="cost" placeholder="هزینه"  id="Cost{{UserId}}" data-userid="{{UserId}}" /></div>'+
						'<div class="col-50"><input type="number" class="payment" placeholder="پرداختی" id="Payment{{UserId}}" data-userid="{{UserId}}" /></div>'+
					'</div>'+
                '</div>'+
              '</div>'+
            '</label></li>';
	createPicker('#DateTimeFa','#DateTimeFaDisplay',defaultvalue,true);
	// Inline date-time
	compiledTemplate = Template7.compile(template);
	target=$$("#userPayments");
	payemntsitem="";
	for (var userid in memberships[groupid]){
		username=users[userid].FirstName+" "+users[userid].LastName;
		if(username.trim()=="")
			username=("0"+users[userid].Phone).toPersianDigit();
		
		target.prepend(compiledTemplate({
			UserName:username,
			UserId:userid
		}));
	} 	
	
	recalculateTotalCost=function (e) { 
		sum=0;
		$$(".cost").each(function(i,n){
			val=$$(n).val()||0;
			intval=parseInt(val,10);
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
		sum=0;
		$$(".payment").each(function(i,n){
			val=$$(n).val()||0;
			intval=parseInt(val,10);
			//console.log(val +" "+intval);
			if(intval!=val||intval<=0){
				$$(n).val('');
				val=0;
			}			
			sum += intval; 
		});
		$$("#sumPayment").html((sum+'').toPersianDigit());
	});	
	$$(page.container).find('#equalDivide').on('click', function () {
		sum=0;
		$$(".payment").each(function(i,n){
			val=$$(n).val()||0;
			intval=parseInt(val,10);
			if(intval!=val||intval<=0)
				return;
			sum += intval; 
		});
		if(sum==0){
			alert("لطفا پرداختی ها را وارد کنید.");
			return;
		}
		checkeduser=$$(".users-checkbox:checked");
		if(checkeduser.length==0){
			alert("لطفا افراد مورد نظر را انتخاب کنید.");
			return;
		}
			
		dong=Math.floor(sum/checkeduser.length);
		checkeduser.each(function(i,v){
			
			if(i==checkeduser.length-1)
				dong=sum;
			$$("#Cost"+$$(v).val()).val(dong);
			sum-=dong;
			
		});
		recalculateTotalCost();
	});
  $$(page.container).find('#submitTransaction').on('click', function () {
	Description=$$(page.container).find('#Description').val();
	Type=$$(page.container).find('#Type').val();
	DateTimeFa=$$(page.container).find('#DateTimeFa').val();
	
	if(!Description){alert("توضیحات را درست وارد کنید");return;}
	if(!Type){alert("نوع تراکنش را درست وارد کنید");return;}
	if(!validateDateTimeFa(DateTimeFa)){alert("زمان را درست وارد کنید");return;}
	Transactions=[];
	
		sumPayment=0;
		$$(".payment").each(function(i,n){
			val=$$(n).val()||0;
			intval=parseInt(val,10);
			if(intval!=val||intval<=0)
				return;
			Transactions.push([$$(n).attr('data-userid'),intval]);
			sumPayment += intval; 
		});
		if(sumPayment==0){alert("لطفا پرداختی ها را وارد کنید.");return;}
		sumCost=0;
		$$(".cost").each(function(i,n){
			val=$$(n).val()||0;
			intval=parseInt(val,10);
			if(intval!=val||intval<=0)
				return;
			Transactions.push([$$(n).attr('data-userid'),-intval]);
			sumCost += intval; 
		});
		if(sumCost==0){alert("لطفا هزینه ها را وارد کنید.");return;	}
		if(sumCost-sumPayment!=0){alert("جمع پرداختی و هزینه برابر نیست. اختلاف:"+Math.abs(sumCost-sumPayment));	return;	}
			
			
	MakeTransaction({
				GroupId:groupid,
				Description:Description,Type:Type,DateTimeFa:DateTimeFa,
				Transactions:Transactions
			}, function(data){
				updateTransactions(function(){
					alert("اطلاعات ثبت شد.");
					mainView.loadPage('dash.html');
			});
		});
	
  });
});
myApp.onPageInit('enterOTP', function (page) {
    
        var phone = page.query.phone;
		$$(page.container).find('#phone').html(""+phone)
		
       $$(page.container).find('#login').on('click', function () {
		   var otp = $$(page.container).find('input[name="otp"]').val();
		if(validatePhone(phone)&&/^([۰-۹]{4}|[0-9]{4})$/i.test(otp))
			post({
				path:"users/login/",
				data:{ Phone: phone,OTP:otp},
				success: function(data){
					
					if(data.Output.SessionKey){
						window.localStorage['sessionkey']=data.Output.SessionKey;
						window.localStorage['userid']=data.Output.User.Id;
						dbserver.Users.update(data.Output.User).then( function ( item ) {
							console.log("stored:");
							console.log(item);
							updateFriends(function(){
								updateGroups(function(){
									mainView.loadPage('dash.html');		
								});
							});
						});						
					}else{
						alert(data);
					}
				},
				error: function(data){
					alert(JSON.stringify(data));
				}
			});		       
		else
			alert("شماره وارد شده صحیح نیست.");
    }); 
    
});
myApp.init();
myApp.onPageInit('newGroup', function (page) {
    
  $$(page.container).find('#submitNewGroup').on('click', function () {
	GroupName=$$(page.container).find('#GroupName').val();
	if(!GroupName){alert("نام گروه را درست وارد کنید");return;}
	
	post({
		path:'Groups/Create',
		data:{
			Name:GroupName
		},
		success: function(data){
			//updateGroups();
			dbserver.Groups.update(data.Output).then(function(){
				updateMemberships(function(){
					alert("اطلاعات ثبت شد.");
					mainView.loadPage('groups.html');
				});
			});
		},
		error: function(data){
			alert(JSON.stringify(data));
		}
	});
  });
});

myApp.onPageInit('editname', function (page) {
	BFa=users[me()].BirthdayFa;
	
	if(BFa<13000000){		
		BFa=13700101;
		defaultvalue = persianDate.fromLong(BFa*1000000);
	}else{
		defaultvalue = persianDate.fromLong(BFa*1000000);
		
		$$('#BirthDayFaDisplay').val(formatDate(defaultvalue,false));
	}
	
	createPicker('#BirthDayFa','#BirthDayFaDisplay',defaultvalue,false);
	// Inline date-time
    
  $$(page.container).find('#submitName').on('click', function () {
	FirstName=$$(page.container).find('#FirstName').val();
	LastName=$$(page.container).find('#LastName').val();
	Email=$$(page.container).find('#Email').val();
	Male=$$(page.container).find('#Gender').val();
	BirthdayFa=$$(page.container).find('#BirthDayFa').val();
	
	if(!FirstName){alert("نام را درست وارد کنید");return;}
	if(!LastName){alert("نام خانوادگی را درست وارد کنید");return;}
	if(!validateEmail(Email)){alert("ایمیل را درست وارد کنید");return;}
	if(!validateDateTimeFa(BirthdayFa*1000000)){alert("تاریخ تولد را درست وارد کنید");return;}
	post({
		path:'users/update',
		data:{
			FirstName:FirstName,LastName:LastName,Phone:users[me()].Phone,Male:Male,Email:Email,BirthdayFa:BirthdayFa
		},
		success: function(data){
			//updateFriends();
			dbserver.Users.update(data.Output).then(function(){
				alert("اطلاعات ثبت شد.");
				mainView.loadPage('dash.html');
			});
			//mainView.loadPage('dash.html');
		},
		error: function(data){
			alert(JSON.stringify(data));
		}
	});
  });
});
////////////////////////////////////////////////////////////////////////////////
myApp.onPageInit('dash', function (page) {
    var virtualList = myApp.virtualList($$('.virtual-list'), {
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
                        '<div class="item-subtitle">گروه {{Group}}</div>' +
                      '</div>' +
                    '</a>' +
                  '</li>',
        // Item height
        height: 63,
    });
    
    var ptrContent = $$(page.container).find('.pull-to-refresh-content');
    // Add 'refresh' listener on it
    ptrContent.on('refresh', function (e) {
		updateTransactions(function(){
			updateFriends(function(){
				updateGroups(function(){
					updateMemberships(function(){
						initorupdateDashList(virtualList);
					});
				});
			});
		});
    });
	initorupdateDashList(virtualList);
		
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
        height: 63,
    });
    
    var ptrContent = $$(page.container).find('.pull-to-refresh-content');
    // Add 'refresh' listener on it
    ptrContent.on('refresh', function (e) {
		updateTransactions(function(){
			initorupdateTransactionList(virtualList,groupid);
		});

    });
	initorupdateTransactionList(virtualList,groupid);
		
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
        height: 63,
    });
    
    var ptrContent = $$(page.container).find('.pull-to-refresh-content');
    // Add 'refresh' listener on it
    ptrContent.on('refresh', function (e) {
		updateTransactions(function(){
			initorupdateGroupsList(virtualList);
		});

    });
	initorupdateGroupsList(virtualList);
		
});
myApp.onPageInit('add-member', function (page) {
	   $$(page.container).find('#َAddMember').on('click', function () {
        var groupid=page.query.groupid;
		var phone = $$(page.container).find('input[name="phone"]').val();
		if(validatePhone(phone))
			post({
				path:"Groups/AddUser",
				data:{ GroupId:groupid,Phone: phone},
				success: function(data){
					//alert(data.Message);
					updateMemberships(function(){
						updateFriends(function(){
							alert("به گروه اضافه شد.");
							mainView.loadPage('group.html?id='+groupid);
						});
					});
					
					//
				},
				error: function(data){
					alert(JSON.stringify(data));
				}
			});		       
		else
			alert("شماره وارد شده صحیح نیست.");
    });
});
myApp.onPageInit('group-members', function (page) {
        var groupid=page.query.groupid;
		var virtualList = myApp.virtualList($$('.group-membersList'), {
        items: [],
        searchAll: function (query, items) {
            var found = [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].User.indexOf(query) >= 0 || query.trim() === '') found.push(i);
            }
            return found; //return array with mathced indexes
        },
        // List item Template7 template
        template: '<li class="item-content">' +                    
					'<div class="item-media"><img src="img/user/{{UserPic}}.png" width="44"/></div>'+
                      '<div class="item-inner">' +
                        '<div class="item-title-row">' +
                          '<div class="item-title">{{FirstName}}  {{LastName}}</div><div class="item-after" style="direction:ltr;">{{money Amount}} </div>' +
                        '</div>' +
	'	<div class="item-subtitle">تلفن: ۰{{pd UserPhone}}</div>'+
                      '</div>' +
                  '</li>',
        // Item height
        height: 63,
    });
    initOrUpdate=function(){
		dbserver.Memberships.query().filter().execute().then(function(results){
			for (var i = 0; i < results.length; i++) {						
				res=results[i];
				if(res.GroupId!=groupid)
					continue;
				user=users[res.UserId];
				item={
						Id:res.Id,
						Amount:  memberships[groupid][user.Id].Cash,
						UserId:user.Id,
						FirstName:user.FirstName,
						LastName:user.LastName,
						UserPhone:user.Phone,
						UserPic:(user.Male?"":"fe")+"male"
					};
					if(!(item.FirstName+item.LastName).trim())
						item.FirstName="بی نام";
				virtualList.prependItem(item);
			}		
		});
	}
	var ptrContent = $$(page.container).find('.pull-to-refresh-content');
    // Add 'refresh' listener on it
    ptrContent.on('refresh', function (e) {
		updateFriends(function(){
			updateMemberships(function(){
				initOrUpdate();
			});
		});

    });
	initOrUpdate();
});

myApp.onPageInit('transaction', function (page) {
	var transactionId = parseInt(page.query.id);
	var firstrow='<div class="item-media"><img src="img/type/'+transactions[transactionId].Type+'.png" width="44"/></div>'
					+'<div class="item-inner">'
					+'  <div class="item-title-row">'
					+'		<div class="item-title">'+transactions[transactionId].Description+'</div>'
					+'  </div>'
					+'	<div class="item-subtitle">گروه '+groups[transactions[transactionId].GroupId].Name+'</div>'
					+'  <div class="item-subtitle">'+formatDate(persianDate.fromLong(transactions[transactionId].DateTimeFa),true)+'</div>'
					
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
        template: '<li class="item-content">' +                    
					'<div class="item-media"><img src="img/user/{{UserPic}}.png" width="44"/></div>'+
                      '<div class="item-inner">' +
                        '<div class="item-title-row">' +
                          '<div class="item-title">{{User}}</div><div class="item-after" style="direction:ltr;">{{money Amount}} </div>' +
                        '</div>' +
	'	<div class="item-subtitle">تلفن: ۰{{pd UserPhone}}</div>'+
                      '</div>' +
                  '</li>',
        // Item height
        height: 63,
    });
    
	dbserver.TransactionDetails.query().filter('TransactionId',transactionId).execute().then(function(results){
		for (var i = 0; i < results.length; i++) {						
			res=results[i];
			user=users[res.UserId];
			item={
					Id:res.Id,
					Amount: res.Amount,
					UserId:user.Id,
					User:user.FirstName+" "+user.LastName,
					UserPhone:user.Phone,
					UserPic:(user.Male?"":"fe")+"male"
					
				};
				if(!item.User.trim())
					item.User="بی نام";
			virtualList.prependItem(item);
		}				
	});

});

}
function createPicker(targetvalue,targetdisplay,defaultvalue,showtime){
	
	days={
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
	months=// Months
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
    years={
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
    divider={
                divider: true,
                content: '&nbsp;&nbsp;'
            };
	hours=// Hours
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
    dividerTime={
                divider: true,
                content: ':'
            };
            // Minutes
	minutes={
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
	cols=[days,months,years];
	if(showtime)
		cols=[days,months,years,divider,hours,dividerTime,minutes];
	defaultValues=[ defaultvalue.getDate(),defaultvalue.getMonth(), defaultvalue.getFullYear(), defaultvalue.getHours(), defaultvalue.getMinutes()-defaultvalue.getMinutes()%10];
	var pickerInline = myApp.picker({
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
			to2Digit=function (val){
				if(!val)
					return '00';
				return (val<10?'0':'')+val;
			};
			$$(targetvalue).val(values[2] + '' + to2Digit(values[1]) +''+to2Digit(values[0])+(showtime?to2Digit(values[3])+to2Digit(values[4])+'00':''));
			pd=persianDate([values[2],values[1],values[0]]);
			if(showtime)
				pd=persianDate([values[2],values[1],values[0],values[3],values[4]]);
			return formatDate(pd,showtime);
            //return displayValues[0] + ' ' + displayValues[1] + ' ' + displayValues[2]+(showtime?' ساعت '+displayValues[3]+':'+displayValues[4]:'' );
        },
        cols:cols
    });
	pickerInline.setValue(defaultValues, 50);
}
dbinit();
//pageReady();
