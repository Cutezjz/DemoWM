var express = require('express');
var app = express();
var fs = require('fs');

app.get('/index.html', function (req, res) {
  res.sendFile( __dirname + "/" + "index.html" );
})

// TODO: This function lists all the users
app.get('/listUser', function(req, res){
  var response = readFile(__dirname+"/data/json/","users.json");
  response = JSON.parse(response);
  res.end(JSON.stringify(response));
});

// This function returns User Information
app.get('/getUser', function(req, res) {
  var response = getUser(req.query.userID);
  //response = JSON.parse(response);
  res.end(JSON.stringify(response));
});

// This function Adds new users
app.get('/addUser', function(req, res) {
    console.log("/addUser : "+JSON.stringify(req.query));
  var fName = req.query.first_name;
  var lName = req.query.last_name;
  var nameOnCard = req.query.name_on_card;
  var card = req.query.card_type;
  var cardNumber = req.query.card_number;
  var expDate = req.query.exp_date;
  var cvv = req.query.cvv;
    var userID = req.query.userID;
  var pwd = req.query.pwd;

  var users = readFile(__dirname+"/data/json/", "users.json");
    users = JSON.parse(users);

    var response = null;
    if(users.hasOwnProperty(userID)){
        user = {
            "firstname": fName,
            "lastname": lName,
            "password": pwd,
            "paymentcard": {
                "nameoncard":nameOnCard,
                "card":card,
                "cardnumber":cardNumber,
                "expdate":expDate,
                "cvv":cvv
            }
        };
        users[userID]=user;
        response = true;
        writeFile(__dirname+"/data/json/", "users.json", users);
    } else {
        response = {
            "error": "110",
            "description": "USerID: "+userID+" already present."
        }
    }

    res.end(JSON.stringify(response));
});

// This function Add new Items to the specified cart
app.get('/addItem', function(req,res){
    console.log("/addItem : "+JSON.stringify(req.query));
  var cartID = req.query.cartID;
  var upc = req.query.upc;
  var userID = req.query.userID;
  var quantity = req.query.quantity;

  console.log("/addItem : "+JSON.stringify(req.query));
  var response = null;

  var carts=readFile(__dirname+"/data/json/","carts.json");
  carts = JSON.parse(carts);

  var cart = getOnlyCart(cartID);

  if(!cart.hasOwnProperty("error")){
      // check if user has access to cart
      if(getGroup(cartID).hasOwnProperty(userID)){
          // check cart status
          if(cart["status"] == "InProgress"){
              if(!cart.hasOwnProperty(upc)){
                  var itemDetails = getItem(upc);
                  // Check if Item is present. Cannot add if Item not in Items.json
                  if(!itemDetails.hasOwnProperty("error")){
                          var itemEntry = {
                              "quantity": quantity,
                              "addedBy": userID
                          };
                          cart[upc] = itemEntry;
                          carts[cartID] = cart;
                          writeFile(__dirname+"/data/json/","carts.json", carts);
                          response = cart;
                  } else {
                      // ERROR Item not present
                      response = itemDetails;
                  }
              } else {
                  response = {
                      "error": "300",
                      "description": "Item is already present in cart. UPC :"+upc+" cartID : "+cartID
                  }
              }
          }
          else {
              response = {
                  "error": "200",
                  "description":"Cart Status is not In Progress"
              };
          }

      } else {
          response = {
              "error": "330",
              "description": "User "+userID+" not authorized to add to cartd : "+cartID
          }
      }
  } else {
      var item = getItem(upc);
      // Create cart and Add item only if its a valid upc
      if(!item.hasOwnProperty("error")){
          var upcEntry = {
              "quantity": quantity,
              "addedBy": userID
          };
          // cartID not present. Create cart with item and status "InProgress"
          cart = {
              "status": "InProgress"
          };
          cart[upc] = upcEntry;
          carts[cartID] = cart;
          response = cart;
          writeFile(__dirname+"/data/json/","carts.json", carts);
      } else {
          response = item;
      }
  }

  res.end(JSON.stringify(response));
});

// This function is user to delete Item from given cart
app.get('/deleteItem', function(req, res){
    console.log("/deleteItem : "+JSON.stringify(req.query));

    var cartID = req.query.cartID;
    var upc = req.query.upc;
    var userID = req.query.userID;
    var response;
    var carts = readFile(__dirname+"/data/json/", "carts.json");
    carts = JSON.parse(carts);
    var cart = getOnlyCart(cartID);
    var itemDetails = getItem(upc);
    var curGroup = getGroup(cartID);

    if(!itemDetails.hasOwnProperty("error")){ // Check for valid item
        if(!cart.hasOwnProperty("error")){ // Check for valid cart
            if(curGroup.hasOwnProperty(userID) && curGroup[userID] == "OWNER"){ // Check if user is authorized
                if(cart.hasOwnProperty(upc)){ // Check if cart has the item
                    // delete the item from cart
                    delete cart[upc];
                    console.log("Deleted Item: "+upc+" from cart: "+cartID+" by User:"+userID);
                    carts[cartID] = cart;
                    writeFile(__dirname+"/data/json/","carts.json",carts);

                } else {
                    response = {
                        "error" : "220",
                        "description": "Item : "+upc+" not found in cart: "+cartID
                    }
                }
            } else {
                response = {
                    "error" : "210",
                    "description": "User: "+userID+" not authorized to cart: "+cartID
                }
            }
        } else {
            response = cart;
        }
    } else {
        response = itemDetails;
    }

    res.end(JSON.stringify(response));
});

// This funciton is to get a cart
app.get('/getCart', function(req, res){
    console.log("/getCart : "+JSON.stringify(req.query));
  var response = getCart(req.query.cartID);
  res.end(JSON.stringify(response));
});

// This function is for checkout
app.get('/checkout', function(req, res){
    console.log("/checkout : "+JSON.stringify(req.query));
  var cartID = req.query.cartID;
  var userID = req.query.userID;
  console.log("/checkout : "+JSON.stringify(req.query));

  var cart = getOnlyCart(req.query.cartID);
  var response = null;
  if(!cart.hasOwnProperty("error")){
      if(getGroup(cartID).hasOwnProperty(userID)){
      // Need to check if the user is in the same group as cart
      if(cart.status != "CheckedOut"){
        cart.status = "CheckedOut";
        var carts = readFile(__dirname+"/data/json/","carts.json");
        carts = JSON.parse(carts);
        carts[cartID] = cart;
        response = true;
        writeFile(__dirname+"/data/json/","carts.json", carts);
        console.log("/Checkout: CartID "+cartID+" CHECKED OUT by "+userID);
      } else {
          response = {
              "error":"550",
              "description": "Cart is already CheckedOut. CartID : "+cartID
          }
      }

    } else {
          response = {
              "error": "330",
              "description": "User "+userID+" not authorized to checkout cartd : "+cartID
          }
    }
  }
  else{
    // CartID not found
    response = cart;
    console.log("/Checkout: ERROR - "+response.description);
  }

  res.end(JSON.stringify(response));
});

app.get("/getGroup", function(req, res){
  console.log("/getGroup : "+JSON.stringify(req.query));
  var groupID = req.query.groupID;
  var response = getGroup(groupID);
  res.end(JSON.stringify(response));
});

app.get("/addGroup", function(req, res){
  console.log("/addGroup: "+JSON.stringify(req.query));

  var groupID = req.query.groupID;
  var userID = req.query.userID;
  var groups = readFile(__dirname+"/data/json/", "groups.json");
  groups = JSON.parse(groups);
  var response = null;

  if(groups.hasOwnProperty(groupID)){
    var groupUsers = groups[groupID];
    if(groupUsers.hasOwnProperty(userID)){
      // User Already a member of group
      response = {
        "error": "440",
        "description": "User "+userID+" is already a member of Group : "+groupID
      }
    } else {
      // Add user
      groupUsers[userID] = "USER";
      groups[groupID] = groupUsers;
      console.log("User "+userID+" added to group "+groupID);
      writeFile(__dirname+"/data/json/", "groups.json",groups);
    }

  } else {
    // Group does not exist. Create a new group and add user
    var groupUsers={};
      groupUsers[userID] = "OWNER";
    groups[groupID] = groupUsers;
    console.log("New Group create, groupID: "+groupID+" with user "+userID+" as OWNER");
    console.log(JSON.stringify(groups));
    writeFile(__dirname+"/data/json/", "groups.json",groups);
  }
  res.end(JSON.stringify(response));
});

// This function is to delete user
app.get('/deleteUser', function(req, res){
  var ID = req.query.userID;
  var users = readFile(__dirname+"/data/json/","users.json");
  users = JSON.parse(users);
  delete users["user"+ID];
  console.log("Number of Users : "+sizeOf(users))
  writeFile(__dirname+"/data/json/","users.json", users);
});

//Services for invitations

/* Service to check for existing/valid invitations*/
app.get('/checkInvitation', function(req, res){
    console.log("/checkInvitation : "+JSON.stringify(req.query));
  var touser = req.query.toUser;
  var invites=readFile(__dirname+"/data/json/","invitations.json");
  invites = JSON.parse(invites);
    var users = readFile(__dirname+"/data/json/", "users.json");
   users = JSON.parse(users);
 if(users.hasOwnProperty(touser)){
     if(invites.hasOwnProperty(touser)){
         var inv = invites[touser];
         response = inv;
     }
     else {
         response = {
             "error": "222",
             "description":"No invitations have been sent for user: "+ touser
         }
     }
 } else {
     response = {
         "error": "700",
         "description":"User: "+ touser+ " is not Registered."
     }
 }
  res.end(JSON.stringify(response,null,'\t'));
});

/* Service to send an invitation */
app.get('/sendInvitation', function(req, res){
    console.log("/sendInvitation : "+JSON.stringify(req.query));
  var touser = req.query.toUser;
  var groupID = req.query.groupID;
  var fromuser = req.query.fromUser;
  var invites=readFile(__dirname+"/data/json/","invitations.json");
  var groups=readFile(__dirname+"/data/json/","groups.json");
  var users=readFile(__dirname+"/data/json/","users.json");

  invites = JSON.parse(invites);
  groups = JSON.parse(groups);
  users = JSON.parse(users);
  console.log(invites);
  var group = groups[groupID];

  if(users.hasOwnProperty(fromuser)){
    if(groups.hasOwnProperty(groupID)){
       if(group.hasOwnProperty(fromuser)){
          if(users.hasOwnProperty(touser)){
              if(!invites.hasOwnProperty(touser)){
                    console.log("New invite has been sent to user : " + touser);
                     var response = {
                       "groupID":groupID,
                       "From"   :fromuser
                     }
                     invites[touser]=response
                     response = true
                     writeFile(__dirname+"/data/json/", "invitations.json",invites );
                     res.end(JSON.stringify(response,null,'\t'));
              }
              else {
                      if(invites[touser].groupID == groupID){
                        response =
                        {
                          "error":"322",
                          "description":"Invitation is already sent to user: "+ touser + " for groupID: "+ groupID + " by user: "+ invites[touser].From
                        }
                        res.end(JSON.stringify(response,null,'\t'));
                      }
                      else {
                        console.log("New invite has been sent to same user for a different group ");
                        var response = {
                          "groupID":groupID,
                          "From"   :fromuser
                        }
                        invites[touser]=response
                        response = true
                        writeFile(__dirname+"/data/json/", "invitations.json",invites );
                        res.end(JSON.stringify(response,null,'\t'));
                      }

                    }
          }
          else{
                         var response = {
                                  "error":"302",
                                  "description":"To user: " + touser+ " is not authorized to access this group: " + groupID
                                  }
                    res.end(JSON.stringify(response,null,'\t'));
                  }
       }
       else{
         var response = {
                      "error":"302",
                      "description":"From user " + fromuser+ " is not authorized to access this group: " + groupID
                      }
        res.end(JSON.stringify(response,null,'\t'));
      }
    }
  else{

    var response = {
      "error":"304",
      "description":"Group ID: " + groupID + " is not valid"
    }
    res.end(JSON.stringify(response,null,'\t'));

}

  }
  else {
    var response = {
      "error":"300",
      "description":"From user " + fromuser + " is not a valid user"
    }
    res.end(JSON.stringify(response,null,'\t'));
  }
});

/* Service to delete the invitation */
app.get('/deleteInvitation', function(req, res){
    console.log("/deleteInvitation : "+JSON.stringify(req.query));
  var touser = req.query.toUser;
  var groupID = req.query.groupID;
  var fromuser = req.query.fromUser;
  var invites=readFile(__dirname+"/data/json/","invitations.json");
  invites = JSON.parse(invites);

  delete invites[touser];

  console.log ("Invitation from "+ fromuser +" denied by :"+ touser );
  writeFile(__dirname+"/data/json/","invitations.json",invites);
});

/* -------------------------- Utility function --------------------------*/
var readFile = function(dir, fileName){
  //console.log("Reading File : "+dir+fileName);
  var data = fs.readFileSync(dir+fileName);
  return data
};
var writeFile = function(dir, fileName, data){
  var result = fs.writeFile(dir+fileName,
      JSON.stringify(data, null,'\t'), function(err){
        if(err){
          return console.log(err);
        }
        console.log("File Write Complete: Updated - "+fileName);
      });
};
var sizeOf = function(jsonObj){ return Object.keys(jsonObj).length };

var getCart = function(ID){
    var cartID = ID;
    var response = null;
    var carts = readFile(__dirname+"/data/json/","carts.json");
    carts = JSON.parse(carts);
    if(carts.hasOwnProperty(cartID)) {
        var cart = carts[cartID];
        var response = {};
        // Loop through cart elememts and create response
        for(var element in cart){
            if(element == "status"){
                response[element] = cart[element];
            } else {
                // Adding additional details for Items
                var Items = readFile(__dirname+"/data/json/", "items.json");
                Items = JSON.parse(Items);

                var curItemDetails = cart[element];
                var itemDetails = Items[element];

                response[element] = {
                    "name": itemDetails["name"],
                    "price": itemDetails["price"],
                    "quantity": curItemDetails["quantity"],
                    "addedBy": curItemDetails["addedBy"]
                }
            }
        }
    } else {
        response = {
            "error" : "400",
            "description":"CartID not found. CartID: "+cartID
        }
    }
    return response;
};

var getOnlyCart = function(ID){
    var cartID = ID;
    var response = null;
    var carts = readFile(__dirname+"/data/json/","carts.json");
    carts = JSON.parse(carts);
    if(carts.hasOwnProperty(cartID)) {
        var cart = carts[cartID];
        var response = cart;

    } else {
        response = {
            "error" : "400",
            "description":"CartID not found. CartID: "+cartID
        }
    }
    return response;
};

var getUser = function(ID){
  var userID = ID;
  var users = readFile(__dirname+"/data/json/","users.json");
  users = JSON.parse(users);
  var response = null;
  response = users[userID];
  if(response == null) {
    var err = {
      "error":500,
      "description":"UserID not found. UserID: "+userID
    }
    response = err;
  }
  return response;
};

var getItem = function(upc){
  var response = null;
  var Items = readFile(__dirname+"/data/json/", "items.json");
  Items = JSON.parse(Items);

  if(Items.hasOwnProperty(upc)){
    response = Items[upc];
  } else {
    response = {
      "error": "500",
      "description": "Item not found. UPC : "+upc
    }
  }
  return response;
}

var getGroup = function(groupID){
  var groups = readFile(__dirname+"/data/json/","groups.json");
  groups = JSON.parse(groups);
  var response = null;
  if(groups.hasOwnProperty(groupID)){
    response = groups[groupID];
  } else {
    response = {
      "error": "660",
      "description": "GroupID not found. GroupID : "+groupID
    }
  }
  return response;
}
/* -------------------------- Server Config --------------------------*/
var server =app.listen(8081, function(){
  var host = server.address().address;
  var port = server.address().port;
  console.log("Example app listening  Ssdd at http://%s:%s", host, port);
});
