/*
 Address Component
*/

// step 1: create address object
  // CHECK: is zip ok? (digits and length 5)
  // CHECK: is city ok? (letters only)
  
// step 2: retrieve JSON data
  // CHECK: is address argument object Address?
  // CHECK: is Date argument object Date?

function Address(street, street2, city, zip, state, phone, nick) { // last three arguments optional w/ Restaurant API in particular
  this.nick = nick;
  this.street = street.split(" ").join("+");
  if (street2) {
    this.street2 = street2.split(" ").join("+");
  } else {
    this.street2 = "";
  }
  this.city = city.split(" ").join("+");
  this.zip = zip;
  this.state = state;
  this.phone = phone;
}

Address.prototype = {
  checkZip: function() {
    var zipRegex = /(^\d{5}$)|(^\d{5}-\d{4}$)/; // regex for Canadian functionality (later to be added): /^[ABCEGHJKLMNPRSTVXY][0-9][A-Z][0-9][A-Z][0-9]$/
    if (!zipRegex.test(this.zip)) { Ordrin._errs.push("Address object - validation - zip code (improperly formatted)"); }
  },
  
  checkPhone: function() {
    var phoneRegex = /^\(?(\d{3})\)?[- .]?(\d{3})[- .]?(\d{4})$/;
    if (this.phone && !phoneRegex.test(this.phone)) { Ordrin._errs.push(["Address object - validation - phone number (improperly formatted)"]); }
  },
  
  checkCity: function() {
    var cityRegex = /[A-Za-z.-]/;
    if (!cityRegex.test(this.city)) { Ordrin._errs.push("Address object - validation - city (letters only)"); }
  },
  
  checkState: function() {
    var checkState = /^([A-Za-z]){2}$/
    if (!checkState.test(this.state)) { Ordrin._errs.push("validation - address - state (must be two-letter state abbreviation)"); }
  },
  
  validate: function() {
    this.checkZip();
    this.checkCity();
    if (this.state) { this.checkState(); }
    if (this.phone) { this.checkPhone(); }
  },

  _convertForAPI: function() {
    return this.zip + "/" + this.city + "/" + this.street;
  }
}