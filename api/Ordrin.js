/*!
 * Ordr.in JavaScript Library Alpha
 * http://www.ordr.in
 *
 * Copyright 2011
 *
 * Last updated: Tuesday, August 9
 */

Ordrin = {
  _apiMethod: "", // whether a reverse origin proxy or JSONP will be used to access API
  _key: "", // API developer key
  _errs: [], // error array pushed into and thrown at end of errors

  _checkEmailPattern : /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, //check email pattern
  _checkEmail        : function(e) { return this._checkEmailPattern.test(e) }, 

  _checkNumsPattern  : /^\s*\d+\s*$/,
  _checkNums         : function(n) { return this._checkNumsPattern.test(n) },

  _checkCCPattern    : /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/, 
  _checkCC           : function(c) { return this._checkCCPattern.test(c) },

  site: "", // domain at which API is grabbed from (either own with reverse origin proxy or Ordrin URL if JSONP used)
  _sites: {}, // optional list of orer, restaurant, and user api urls
  
  initialize: function(key, site, apiMethod) {
    // establish the developer key and site used + validate
    if (!key) { this._errs.push("connection - no API key provided"); }
    if (!site) { this._errs.push("connection - no site provided (your own in case of reverse origin proxy, Ordr.in's in case of JSONP being used)"); }
    if (typeof site === "string"){
      // site is a string so there is only one url
      this._sites.restaurant = site;
      this._sites.order      = site;
      this._sites.user       = site;
    }else{
      // site is an object with 3 urls so store it in the sites object
      this._sites = site;
    }
    this._key = key;
    this._apiMethod = apiMethod;

    if (this._errs[0]) { throw this._errs; }
    
    // and if API method is not specified, default to XHR
    if (!apiMethod) { this._xmlhttp = new XMLHttpRequest(); } // if no API method specified, default to using reverse origin proxy methods
  },
  
  _apiRequest: function(api, request, func, errorFunc, params) {
      var paramsURL = ""; // params strung into URL
      var userAuth = 0; // whether or not user authentication is required for request (sets header with proxy, adds to query string with JSONP)
      var outForm = []; // form data
      var appends = []; // global appends to query string (timestamp, JSONP, etc.)
      
      // validation
      if (!(this._key || this.site)) { this._errs.push("API initialization - API must be initialized before making any requests"); }
      if (this._errs[0]) {
        var _errscopy = this._errs;
        this._errs = [];
        throw _errscopy;
      }
      
      // string together all params for either submission
      for (var i = 4; i < arguments.length; i++) {
        if (!/[=]/.test(arguments[i])) {
          paramsURL = paramsURL + "/" + arguments[i]; 
        } else {
          arguments[i].split(" ").join("+");
          outForm.push(arguments[i].split("="));
        }
      }
      
      appends.push(["_auth", "1," + this._key]);

      if (this._xmlhttp) { // reverse origin proxy method
        console.log("url: " + url);
        
        for (var i = 0; i < outForm.length; i++) {
          outForm[i] = outForm[i].join("=");
        }
        
        outForm = outForm.join("&");
  
        // set what kind of connection is being made based on API (user API split into a get, post, delete, put components)
        switch (api) {
          case "r": 
            this.site = this._sites.restaurant;
            var url = this.site + "/" + request + paramsURL; //  Ordrin._append; // NEEDS HTTPS:// ADDED AFTER TESTING
            this._xmlhttp.open("GET",url + "/100",true);
          break;
          case "o": 
            this.site = this._sites.order;
            var url = this.site + "/" + request + paramsURL; //  Ordrin._append; // NEEDS HTTPS:// ADDED AFTER TESTING
            this._xmlhttp.open("POST",url,true); 
          break;
          case "uG": 
            this.site = this._sites.user;
            this._xmlhttp.open("GET",url,true);
            userAuth = 1;
          break;
          case "uP": 
            this.site = this._sites.user;
            this._xmlhttp.open("POST",url,true);
          break;
          case "uPu": 
            this.site = this._sites.user;
            this._xmlhttp.open("PUT",url,true);
            userAuth = 1;
            break;
          case "uD": 
            this.site = this._sites.user;
            this._xmlhttp.open("DELETE",url,true);
            userAuth = 1;
          break;
        }
        
        // feed data into callback function
        if (func) {
          this._xmlhttp.onreadystatechange = function() {
          	if (this.readyState == 4){
          		if (this.status == 200){
          			func(this.responseText); 
          			console.log("response: " + this.responseText);
          		}else{
          			errorFunc(this.status);
          		}
          	}
          };
        }
        
        // set developer key header
        this._xmlhttp.setRequestHeader("X-NAAMA-CLIENT-AUTHENTICATION", 'id="' + this._key + '", version="1"');
        // generate header if needed in certain User API requests
        if (userAuth) {
          var hashcode = ordrin_SHA256(ordrin_SHA256(Ordrin.u.currPass) + Ordrin.u.currEmail + "/" + request + paramsURL);
          this._xmlhttp.setRequestHeader("X-NAAMA-AUTHENTICATION", 'username="' + Ordrin.u.currEmail + '", response="' + hashcode + '", version="1"');
        }
        this._xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

        // send out the submission (with form data if present)
        if (outForm) {
          this._xmlhttp.send(outForm);
        } else {
          this._xmlhttp.send();
        }
      } else {
        // JSONP method
        appends.push(["jsonp", func]);
        
        // setting method in query string, and whether or not userAuth required
        switch (api) {
          case "r": 
            this.site = this._sites.restaurant;
          break;
          case "o": 
            this.site = this._sites.order;
          break;
          case "uG": this.site = this._sites.user; userAuth = 1; break;
          case "uP": this.site = this._sites.user; appends.push(["_method", "POST"]); api = "u"; break;
          case "uPu": this.site = this._sites.user; appends.push(["_method", "PUT"]); api = "u"; userAuth = 1; break;
          case "uD": this.site = this._sites.user; appends.push(["_method", "DELETE"]); api = "u"; userAuth = 1; break;
        }
        
        // user authentication string required for certain requests added into query
        if (userAuth) {
          if (!(Ordrin.u.currEmail || Ordrin.u.currPass)) {
            Ordrin._errs.push("API initialization - cannot access user API without setting up current account (user and pass) with u.setCurrAcct");
            throw Ordrin._errs;
          }
          var hashcode = ordrin_SHA256(ordrin_SHA256(Ordrin.u.currPass) + Ordrin.u.currEmail + "/" + request + paramsURL);
          
          appends.push(["_uauth=1," + Ordrin.u.currEmail + "," + hashcode]);
        }
        
        var cx = new Date();
        appends.push(["_cx", cx.getTime()]); // timestamp creation to avoid caching of requests
    
        // stringing together of appends and form data to query
        for (var i = 0; i < appends.length; i++) {
          appends[i] = appends[i].join("=");
        }
        
        for (var i = 0; i < outForm.length; i++) {
          outForm[i] = outForm[i].join("=");
        }
        
        var _append = "?" + appends.join("&");
        if (outForm) { _append += "&" + outForm.join("&"); } // no need for extra & unless form data included in query
        
        // submission time
        // var url = "https://" + api + "-test.ordr.in/" + request + paramsURL + _append; 
        var url = this.site + "/" + request + paramsURL + _append;
        if (document.getElementById('jsonp')) { document.getElementById('jsonp').parentNode.removeChild(document.getElementById('jsonp')); } // clean up any previous scripts injected into head
        
        // script injection
        var s = document.createElement('script');
        s.src = url;
        s.type = 'text/javascript';
        s.id = "jsonp";
      
        if (document.getElementsByTagName('head').length > 0) document.getElementsByTagName('head')[0].appendChild(s);
      }
  },
  
  // Restaurant API
  r: {
    deliveryList: function(dTime, addr, func, errorFunc) {
      if (!(dTime instanceof Date)) { Ordrin._errs.push("Ordrin.r.deliveryList - argument type - date argument provided must be provided as Date object (standard Javascript object)"); }
      if (!(addr instanceof Address)) { Ordrin._errs.push("Ordrin.r.deliveryList - argument type - address provided must be provided as Address object (included in Ordrin JS API)"); }
      for (var i=0;i<3;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.r.deliveryList - validation - all arguments required; no null values allowed (arguments: Date object, Address object, callback function)"); }
      }
      addr.validate(); 
      
      Ordrin._apiRequest("r", "dl", func, errorFunc, dTime._convertForAPI(), addr._convertForAPI());
    },
    deliveryCheck: function(restID, dTime, addr, func, errorFunc) {   
      if (!(dTime instanceof Date)) { Ordrin._errs.push("Ordrin.r.deliveryCheck - argument type - date provided must be provided as Date object (standard JS object)"); }
      if (!(addr instanceof Address)) { Ordrin._errs.push("Ordrin.r.deliveryCheck - argument type - address provided must be provided as Address object (included in Ordrin JS API)"); }
      if (!Ordrin._checkNums(restID)) { Ordrin._errs.push("Ordrin.r.deliveryCheck - validation - restaurant ID must be provided and numerical"); }
      for (var i=0;i<4;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.r.deliveryCheck - validation - all arguments required; no null values allowed (arguments: restaurant ID, Date object, Address object, callback function)"); }
      }
      addr.validate();
      
      Ordrin._apiRequest("r", "dc", func, errorFunc, restID, dTime._convertForAPI(), addr._convertForAPI());
    },
    deliveryFee: function(restID, subtotal, tip, dTime, addr, func, errorFunc) {
      if (!(dTime instanceof Date)) { Ordrin._errs.push("Ordrin.r.deliveryFee - argument type - date provided must be provided as Date object (standard JS object)"); }
      if (!(addr instanceof Address)) { Ordrin._errs.push("Ordrin.r.deliveryFee - argument type - address provided must be provided as Address object (included in Ordrin JS API)"); }
      if (!(subtotal instanceof Money)) { Ordrin._errs.push("Ordrin.r.deliveryFee - argument type - subtotal must be provided as Money object (included in Ordrin JS API)"); }
      if (!(tip instanceof Money)) { Ordrin._errs.push("Ordrin.r.deliveryFee - argument type - tip must be provided as Money object (included in Ordrin JS API)"); }
      if (!Ordrin._checkNums(restID)) { Ordrin._errs.push("validation - restaurant ID must be provided and numerical"); }
      for (var i=0;i<6;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.r.deliveryFee - validation - all arguments required for function; no null values allowed (arguments: restaurant ID, Money object for subtotal, Money object for tip, Date object, Address object, callback function)"); }
      } 
      addr.validate();
      
      console.log(Ordrin._errs);
      Ordrin._apiRequest("r", "fee", func, errorFunc, restID, subtotal._convertForAPI(), tip._convertForAPI(), dTime._convertForAPI(), addr._convertForAPI());
    },
    details: function(restaurantID, func, errorFunc) {
      if (!Ordrin._checkNums(restaurantID)) { Ordrin._errs.push("Ordrin.r.details - validation - restaurant ID must be provided and numerical"); }
      for (var i=0;i<2;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.r.details - validation - all arguments required for function; no null values allowed (restaurant ID and callback function)"); }
      }
      
      Ordrin._apiRequest("r", "rd", func, errorFunc, restaurantID);
    }
  },
  
  // Order API 
  o: {
    submit: function(restaurantID, tray, tip, dTime, em, password, first_name, last_name, addr, card_name, card_number, card_cvc, card_expiry, ccAddr, success_url, fail_url, func, errorFunc) {      
      for (var i=0;i<12;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.o.submit - validation - all arguments required; no null values allowed"); }
      }
      if (!(tip instanceof Money)) { Ordrin._errs.push("Ordrin.o.submit - argument type - tip must be provided as Money object (included in Ordrin JS API)"); }
      if (!(dTime instanceof Date)) { Ordrin._errs.push("Ordrin.o.submit - argument type - date provided must be provided as Date object (standard JS object)"); }
      if (!(addr instanceof Address)) { Ordrin._errs.push("Ordrin.o.submit - argument type - address provided must be provided as Address object (included in Ordrin JS API)"); }
      if (!(ccAddr instanceof Address)) { Ordrin._errs.push("Ordrin.o.submit - argument type - credit card address provided must be provided as Address object (included in Ordrin JS API)"); }
      if (!Ordrin._checkEmail(em)) { Ordrin._errs.push("Ordrin.o.submit - validation - email (improperly formatted)"); }
      if (!Ordrin._checkCC(card_number)) { Ordrin._errs.push("Ordrin.o.submit - validation - credit card number (invalid)"); }
      if (!Ordrin._checkNums(restaurantID)) { Ordrin._errs.push("Ordrin.o.submit - validation - restaurant ID (only numbers allowed)"); }
      if (!Ordrin._checkNums(card_cvc)) { Ordrin._errs.push("Ordrin.o.submit- validation - card security code (only numbers allowed)"); }
      if (func == undefined)
          func = "";
      
      if (Ordrin._apiMethod) {
        if (Ordrin._errs[0]) {
          _errscopy = Ordrin._errs;
          Ordrin._errs = [];
          throw _errscopy;
        }
        
        // using a hidden form to submit the order via POST without reverse origin proxy
        var form = document.createElement("form");
        form.setAttribute("method", "POST");
        form.setAttribute("action", Ordrin._site + "/o/" + restaurantID);

        var argNames = ["restaurantID", "tray", "tip", "dTime", "em", "password", "first_name", "last_name", "addr", "card_name", "card_number", "card_cvc", "card_expiry", "ccAddr", "success_url", "fail_url"];

        // adding in all parameters for order form
        for(var key in arguments) {
          var hiddenField = document.createElement("input");
          hiddenField.setAttribute("type", "hidden");

          switch (argNames[key]) { // if extracting data from API objects
            case "tip": hiddenField.setAttribute("name", "tip"); hiddenField.setAttribute("value", arguments[key]._convertForAPI()); form.appendChild(hiddenField); break;
            case "dTime":
              hiddenField.setAttribute("name", "delivery_date");
              if (dTime.asap == 1) {
                hiddenField.setAttribute("value", "ASAP");
              } else {
                var month = arguments[key].getMonth() + 1;
                if (month < 10) { month = "0" + month; }
                var day = arguments[key].getDate();
                if (day < 10) { day = "0" + day; }
                hiddenField.setAttribute("value", month + "-" + day);
              
                var hiddenField2 = document.createElement("input");
                hiddenField2.setAttribute("type", "hidden");
                hiddenField2.setAttribute("name", "delivery_time");
                var hours = arguments[key].getHours();
                if (hours < 10) { hours = "0" + hours; }
                var minutes = arguments[key].getMinutes();
                if (minutes < 10) { minutes = "0" + minutes; }
                hiddenField2.setAttribute("value", hours + ":" + minutes);
                form.appendChild(hiddenField2);
              }
            break;
            case "password":
              hiddenField.setAttribute("name", argNames[key]);
              hiddenField.setAttribute("value", ordrin_SHA256(arguments[key]));
            break;
            case "addr":
              hiddenField.setAttribute("name", "addr");
              hiddenField.setAttribute("value", arguments[key].street);
              
              var hiddenField2 = document.createElement("input");
              hiddenField2.setAttribute("type", "hidden");
              hiddenField2.setAttribute("name", "city");
              hiddenField2.setAttribute("value", arguments[key].city);
              form.appendChild(hiddenField2);
              
              var hiddenField3 = document.createElement("input");
              hiddenField3.setAttribute("type", "hidden");
              hiddenField3.setAttribute("name", "state");
              hiddenField3.setAttribute("value", arguments[key].state);
              form.appendChild(hiddenField3);
              
              var hiddenField4 = document.createElement("input");
              hiddenField4.setAttribute("type", "hidden");
              hiddenField4.setAttribute("name", "zip");
              hiddenField4.setAttribute("value", arguments[key].zip);
              form.appendChild(hiddenField4);
              
              var hiddenField5 = document.createElement("input");
              hiddenField5.setAttribute("type", "hidden");
              hiddenField5.setAttribute("name", "phone");
              hiddenField5.setAttribute("value", arguments[key].phone);
              form.appendChild(hiddenField5);
            break;
            case "ccAddr":
              hiddenField.setAttribute("name", "card_bill_addr");
              hiddenField.setAttribute("value", arguments[key].street);
              
              var hiddenField2 = document.createElement("input");
              hiddenField2.setAttribute("type", "hidden");
              hiddenField2.setAttribute("name", "card_bill_addr2");
              hiddenField2.setAttribute("value", arguments[key].street2);
              form.appendChild(hiddenField2);
              
              var hiddenField3 = document.createElement("input");
              hiddenField3.setAttribute("type", "hidden");
              hiddenField3.setAttribute("name", "card_bill_city");
              hiddenField3.setAttribute("value", arguments[key].city);
              form.appendChild(hiddenField3);
              
              var hiddenField4 = document.createElement("input");
              hiddenField4.setAttribute("type", "hidden");
              hiddenField4.setAttribute("name", "card_bill_state");
              hiddenField4.setAttribute("value", arguments[key].state);
              form.appendChild(hiddenField4);
              
              var hiddenField5 = document.createElement("input");
              hiddenField5.setAttribute("type", "hidden");
              hiddenField5.setAttribute("name", "card_bill_zip");
              hiddenField5.setAttribute("value", arguments[key].zip);
              form.appendChild(hiddenField5);
            break;
            default:
              hiddenField.setAttribute("name", argNames[key]);
              hiddenField.setAttribute("value", arguments[key]);
            break;
          }

          form.appendChild(hiddenField);
        }
        
        hiddenFieldType = document.createElement("input");
        hiddenFieldType.setAttribute("type", "hidden");
        hiddenFieldType.setAttribute("name", "type");
        hiddenFieldType.setAttribute("value", "RES");
        form.appendChild(hiddenFieldType);
        
        document.body.appendChild(form);
        form.submit();
      } else {
        if (dTime.asap == 1) {
          date = "ASAP"; time = "";
        } else {
          var month = dTime.getMonth() + 1;
          if (month < 10) { month = "0" + month; }
          var day = dTime.getDate();
          if (day < 10) { day = "0" + day; }
          date = month + "-" + day;
  
          var hours = dTime.getHours();
          if (hours < 10) { hours = "0" + hours; }
          var minutes = dTime.getMinutes();
          if (minutes < 10) { minutes = "0" + minutes; }
          time = hours + ":" + minutes;
        }

        Ordrin._apiRequest("o", "o", func, errorFunc, restaurantID, "tray=" + tray, "tip=" + tip._convertForAPI(), "delivery_date=" + date, "delivery_time=" + time, "first_name=" + first_name, "last_name=" + last_name, "addr=" + addr.street, "city=" + addr.city, "state=" + addr.state, "zip=" + addr.zip, "phone=" + addr.phone, "em=" + em, "password=" + ordrin_SHA256(password), "card_name=" + card_name, "card_number=" + card_number, "card_cvc=" + card_cvc, "card_expiry=" + card_expiry, "card_bill_addr=" + ccAddr.street, "card_bill_addr2=" + ccAddr.street2, "card_bill_city=" + ccAddr.city, "card_bill_state=" + ccAddr.state, "card_bill_zip=" + ccAddr.zip, "success_url=" + success_url, "fail_url=" + fail_url, "type=RES");
      }
    }
  },
  
  // User API 
  u: {
    currEmail: "",
    currPass: "",
    
    makeAcct: function(email, password, firstName, lastName, func, errorFunc) {
      for (var i=0;i<5;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.u.makeAcct - validation - all arguments required for function; no null values allowed (arguments: email, password, first name, last name, and callback function)"); }
      }
      if (!Ordrin._checkEmail(email)) { Ordrin._errs.push("Ordrin.u.makeAcct - validation - email (improperly formatted)"); }
      
      Ordrin._apiRequest("uP", "u", func, errorFunc, email, "first_name=" + firstName, "last_name=" + lastName, "password=" + password); // password needs to be SHA encoded in later versions
    },
    setCurrAcct: function(email, password) {
      for (var i=0;i<2;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.u.setCurrAcct - validation - all arguments required for function; no null values allowed (arguments: email and password)"); }
      }
      if (!Ordrin._checkEmail(email)) { Ordrin._errs.push("Ordrin.u.setCurrAcct - validation - email (improperly formatted)"); }
      
      if( Ordrin._errs.length ) { throw( Ordrin._errs ) }
      this.currEmail = email;
      this.currPass = password;
    },
    getAcct: function(func, errorFunc) {
      for (var i=0;i<1;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.u.getAcct - validation - all arguments required for function; no null values allowed (callback function)"); }
      }
      
      Ordrin._apiRequest("uG", "u", func, errorFunc, this.currEmail);
    },
    getAddress: function(nickname, func, errorFunc) {
      if (typeof arguments === "undefined") { Ordrin._errs.push("Ordrin.u.getAddress - validation - no arguments provided; no null values allowed (need nickname to grab a particular address or blank ('') to grab all in first argument, callback function in second)"); }
      
      if (nickname) { Ordrin._apiRequest("uG", "u", func, errorFunc, this.currEmail, "addrs", nickname); } else { Ordrin._apiRequest("uG", "u", func, errorFunc, this.currEmail, "addrs"); }
    },
    updateAddress: function(addr, func, errorFunc) {
      if (!(addr instanceof Address)) { Ordrin._errs.push("Ordrin.u.updateAddress - argument type - address provided must be provided as Address object (included in Ordrin JS API)"); }
      for (var i=0;i<1;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.u.updateAddress - validation - all arguments required for function; no null values allowed (arguments: Address object, callback function)"); }
      }
      
      addr.validate();
      Ordrin._apiRequest("uPu", "u", func, errorFunc, this.currEmail, "addrs", addr.nick, "addr=" + addr.street, "addr2=" + addr.street2, "city=" + addr.city, "state=" + addr.state, "zip=" + addr.zip, "phone=" + addr.phone);  
    },
    deleteAddress: function(nickname, func, errorFunc) {
      for (var i=0;i<2;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.u.deleteAddress - validation - all arguments required for function; no null values allowed "); }
      }
      
      Ordrin._apiRequest("uD", "u", func, errorFunc, this.currEmail, "addrs", nickname);
    },
    getCard: function(nickname, func, errorFunc) {
      if (typeof arguments === "undefined") { Ordrin._errs.push("Ordrin.u.getCard - validation - no arguments provided; no null values allowed (need nickname to grab a particular card or blank ('') to grab all in first argument, callback function in second)"); }
      
      if (nickname) { Ordrin._apiRequest("uG", "u", func, errorFunc, this.currEmail, "ccs", nickname); } else { Ordrin._apiRequest("uG", "u", func, errorFunc, this.currEmail, "ccs"); }
    },
    updateCard: function(nickname, name, number, cvc, expiryMonth, expiryYear, addr, func, errorFunc) {
      if (!Ordrin._checkCC(number)) { Ordrin._errs.push("Ordrin.o.updateCard - validation - credit card number (invalid)"); }
      if (!Ordrin._checkNums(cvc)) { Ordrin._errs.push("Ordrin.o.updateCard - validation - credit card security code (invalid)"); }
      if (!(addr instanceof Address)) { Ordrin._errs.push("Ordrin.u.updateCard - argument type - address provided must be provided as Address object (included in Ordrin JS API)"); }
      for (var i=0;i<8;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.u.updateCard - validation - all arguments required for function; no null values allowed "); }
      }
      addr.validate();
    
      Ordrin._apiRequest("uPu", "u", func, errorFunc, this.currEmail, "ccs", nickname, "name=" + name, "number=" + number, "cvc=" + cvc, "expiry_month=" + expiryMonth, "expiry_year=" + expiryYear, "bill_addr=" + addr.street, "bill_addr2=" + addr.street2, "bill_city=" + addr.city, "bill_state=" + addr.state, "bill_zip=" + addr.zip);  
    },
    deleteCard: function(nickname, func, errorFunc) {
      for (var i=0;i<2;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.u.deleteCard - validation - all arguments required for function (no blank, null, or undefined values allowed)"); }
      }
      
      Ordrin._apiRequest("uD", "u", func, errorFunc, this.currEmail, "ccs", nickname);
    },
    orderHistory: function(orderID, func, errorFunc) {
      if (typeof arguments === "undefined") { Ordrin._errs.push("Ordrin.u.orderHistory - validation - no arguments provided (need order ID for particular order or blank ('') to grab all in first argument, callback in second)"); }
      
      if (orderID) { Ordrin._apiRequest("uG", "u", func, errorFunc, this.currEmail, "order", orderID); } else { Ordrin._apiRequest("uG", "u", func, errorFunc, this.currEmail, "orders"); }
    },
    updatePassword: function(password, func, errorFunc) {
      for (var i=0;i<2;i++) {
        if (arguments[i] == "" || arguments[i] == null || typeof arguments[i] === "undefined") { Ordrin._errs.push("Ordrin.u.updatePassword - validation - all arguments required for function (no blank, null, or undefined values allowed"); }
      }
      
      Ordrin._apiRequest("uPu", "u", func, errorFunc, this.currEmail, "password", "password=" + ordrin_SHA256(password));
      this.currPass = password;
    }
  }
}

/**
*
*  Secure Hash Algorithm (SHA256)
*  http://www.webtoolkit.info/
*
*  Original code by Angel Marin, Paul Johnston.
*
**/
 
function ordrin_SHA256(s){
	var chrsz   = 8;
	var hexcase = 0;
 
	function safe_add (x, y) {
		var lsw = (x & 0xFFFF) + (y & 0xFFFF);
		var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
		return (msw << 16) | (lsw & 0xFFFF);
	}
 
	function S (X, n) { return ( X >>> n ) | (X << (32 - n)); }
	function R (X, n) { return ( X >>> n ); }
	function Ch(x, y, z) { return ((x & y) ^ ((~x) & z)); }
	function Maj(x, y, z) { return ((x & y) ^ (x & z) ^ (y & z)); }
	function Sigma0256(x) { return (S(x, 2) ^ S(x, 13) ^ S(x, 22)); }
	function Sigma1256(x) { return (S(x, 6) ^ S(x, 11) ^ S(x, 25)); }
	function Gamma0256(x) { return (S(x, 7) ^ S(x, 18) ^ R(x, 3)); }
	function Gamma1256(x) { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }
 
	function core_sha256 (m, l) {
		var K = new Array(0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2);
		var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
		var W = new Array(64);
		var a, b, c, d, e, f, g, h, i, j;
		var T1, T2;
 
		m[l >> 5] |= 0x80 << (24 - l % 32);
		m[((l + 64 >> 9) << 4) + 15] = l;
 
		for ( var i = 0; i<m.length; i+=16 ) {
			a = HASH[0];
			b = HASH[1];
			c = HASH[2];
			d = HASH[3];
			e = HASH[4];
			f = HASH[5];
			g = HASH[6];
			h = HASH[7];
 
			for ( var j = 0; j<64; j++) {
				if (j < 16) W[j] = m[j + i];
				else W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
 
				T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
				T2 = safe_add(Sigma0256(a), Maj(a, b, c));
 
				h = g;
				g = f;
				f = e;
				e = safe_add(d, T1);
				d = c;
				c = b;
				b = a;
				a = safe_add(T1, T2);
			}
 
			HASH[0] = safe_add(a, HASH[0]);
			HASH[1] = safe_add(b, HASH[1]);
			HASH[2] = safe_add(c, HASH[2]);
			HASH[3] = safe_add(d, HASH[3]);
			HASH[4] = safe_add(e, HASH[4]);
			HASH[5] = safe_add(f, HASH[5]);
			HASH[6] = safe_add(g, HASH[6]);
			HASH[7] = safe_add(h, HASH[7]);
		}
		return HASH;
	}
 
	function str2binb (str) {
		var bin = Array();
		var mask = (1 << chrsz) - 1;
		for(var i = 0; i < str.length * chrsz; i += chrsz) {
			bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i%32);
		}
		return bin;
	}
 
	function Utf8Encode(string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if ((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	}
 
	function binb2hex (binarray) {
		var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
		var str = "";
		for(var i = 0; i < binarray.length * 4; i++) {
			str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
			hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
		}
		return str;
	}
 
	s = Utf8Encode(s);
	return binb2hex(core_sha256(str2binb(s), s.length * chrsz));
 
}
