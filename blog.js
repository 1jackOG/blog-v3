const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const multer  = require('multer')
const session = require('express-session')
const fs = require('fs');
require('dotenv').config()
const passport = require("passport");
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require("passport-local-mongoose");
const post = require('./Post');
const contacts = ["Email : faiz@gmail.com","Post Address : 315/3 house no 14","Phone : 4545343431"];
var path = require('path');
app.use(session({
    secret: "our",
    resave: false,
    saveUninitialized:false,
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect(process.env.MONGO_URL,{ useNewUrlParser:true });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
const upload = multer({ storage: storage });
app.use(express.static(__dirname + '/public'));
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const userSchema = new mongoose.Schema({
    username:String,
    Email:String,
    Password:String,
    profileIMG:String,
    qoute:String
});
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRECT
}); 
async function uploadToCloudinary(locaFilePath) {
    return cloudinary.uploader.upload(locaFilePath).then((result) => {fs.unlinkSync(locaFilePath);return {message: "Success",url: result.url,};}).catch((error) => {fs.unlinkSync(locaFilePath);return { message: "Fail" };});
  }
userSchema.plugin(passportLocalMongoose);
const users = mongoose.model('USERS',userSchema);
passport.use(new LocalStrategy(users.authenticate()));
passport.serializeUser(users.serializeUser());
passport.deserializeUser(users.deserializeUser());
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use('/', express.static(path.join(__dirname, 'public')))
const blogschema = new mongoose.Schema({
    title: String,
    content: String,
});

const blog = mongoose.model("Blog", blogschema);
app.get('/',function(req,res)
{
  if(req.isAuthenticated)
  {
    post.find({},function(err,found)
    {
    res.render('home',{content:found})
    })
}
else{
  res.redirect('/welcome')
}
})
app.get("/home/:username", function(req,res){
if(req.isAuthenticated())
{ 
post.find({username:req.params.username},function(err,found)
{
if(err){console.log(err)}
users.find({username:req.params.username},function(err,founds){
if(err){console.log(err)}
res.render("list",{contents:found,users:founds[0]});})
})}
else{
  res.redirect("/welcome");
}
});
app.post("/delete",function(req,res)
{
    console.log(req.body.delete)
    post.findByIdAndRemove(req.body.delete,function(err)
    {
        if(!err){
            console.log("success")
            res.redirect("/home/"+req.user.username);
        }
    })
});
app.get("/about", function(req,res){
    res.render("about",{title: "About", content:""});
});
app.get("/contact", function(req,res){
    res.render("contact",{title: "Contact me",content:contacts});
});
app.get("/home",function(req,res)
{
     res.render('Home',{users:null});
})
app.get("/loginpage",function(req,res)
{
    res.render("login");
});
app.get("/write/:username",function(req,res)
{
  if(req.isAuthenticated())
  {
    res.render('post',{users:req.user.username})
  }
})
app.post('/register',function(req,res)
{
    users.register(new users({email:req.body.email,username:req.body.username}),req.body.password,function(err, user){ 
      if (err) { 
        console.log(req.body)
        res.redirect('/register') 
      }else{ 
        res.redirect('/loginpage')
      } 
    }); 
});
app.get('/register',function(req,res)
{
  res.render("Register");
});
app.post('/login', 
passport.authenticate('local', { failureRedirect: '/loginpage' }),function(req, res) {
res.redirect('/'+'home/'+req.user.username)
});
app.post('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/Home');});});
app.post('/publish/:username',upload.single('uploaded_file'),async(req, res,next)=>{
var thumbnails = await uploadToCloudinary(req.file.path);
console.log(req.params.username)
  const uploaduser = new post({
  title:req.body.title,
  content:req.body.content,
  thumbnail:thumbnails.url,
  username:req.params.username,
  categories:"food",
  })
  uploaduser.save();
  res.redirect('/home/'+req.params.username)
});
app.get('/blog/Profile/:username',function(req,res)
{
  if(req.isAuthenticated)
  {
    users.find({username:req.user.username},function(err,found)
    {
    if(err){console.log(err)}
    console.log(found)
    res.render('profile',{users:req.user.username,content:found});
  })
  }
})
app.post('/Profile/update/:username',upload.single('uploaded_file'),async(req, res,next)=>{
  var profilepic = await uploadToCloudinary(req.file.path);
  
  if(req.isAuthenticated)
  { console.log(profilepic)
    users.findOneAndUpdate({username:req.params.username},{$set :{qoute:req.body.quotes,profileIMG:profilepic.url}},function(err,user)
    {
      console.log(user)
      console.log(err)
    })
  }
})
app.get('/welcome',function(req,res)
{
  post.find({},function(err,found)
  {
    res.render('userhomepage',{contents:found,users:req.user})
  })
})
app.get('/article/:id',function(req,res)
{
post.findById(req.params.id,function(err,found)
{
  res.render('article',{contents:found,users:req.user})
})
});
app.get('/home/view/:username',function(req,res)
{
  post.find({username:req.params.username},function(err,found)
  {
    res.render('userhomepage',{contents:found,users:req.user})
  })
})
app.listen(process.env.PORT || 3000,function()
{
    console.log("server started");
});