/*
 DateTime Component: Extends native Date object in Javascript
 Converted to API as either "ASAP" or URI format [2 digit month]-[2 digit day]+[2 digit hours (24 hour clock):[2 digit minutes]
 
 Note: ALWAYS use local time!
*/

Date.prototype._convertForAPI = function() {
  this._validate();
  if (this.asap) {
    return "ASAP";
  } else {
    var month = this.getMonth();
    var date = this.getDate();
    var hours = this.getHours();
    var mins = this.getMinutes();
    
    if (month < 10) { month = "0" + month; } 
    if (date < 10) { date = "0" + date; }
    if (hours < 10) { hours = "0" + hours; } 
    if (mins < 10) { mins = "0" + mins; }
    
    var datetime = month + "-" + date + "+" + hours + ":" + mins;
    return datetime;
  }
}

Date.prototype.setASAP = function() {
  this.asap = 1;
}

Date.prototype._validate = function() {
  if (!this.asap) {
    var oiNow = new Date();
    if (this.getTime() < oiNow.getTime()) { Ordrin._errs.push("Date object - validation - date/time cannot be in the past"); }
  }
}