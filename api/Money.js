/*
 Money Component
 
 Currently just converts dollars to cents for API submission.
*/

function Money(amount) {
  if (isNaN(parseFloat(amount))) {
    Ordrin._errs.push("Money object - validation - must be numerical");
  } else {
    this.amount = amount;
  }
}

Money.prototype._convertForAPI = function() {
  return parseFloat(this.amount);
}