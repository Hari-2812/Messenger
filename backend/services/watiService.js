const crypto = require('crypto');
const { getWatiConfig } = require('../config/wati');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [1000, 2000, 4000];
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));


const normalizePhone = (phone) =>
  String(phone || '').replace(/\D/g, '');


// ===============================
// TEMPLATE HELPERS
// ===============================

const getTemplateBody = (template) => {

  const components =
    template.components ||
    template.template?.components ||
    [];


  const body = components.find(
    c => String(c.type || '').toUpperCase() === 'BODY'
  );


  return (
    body?.text ||
    template.body ||
    template.bodyText ||
    template.templateBody ||
    ''
  );

};



const countVariables = (text) => {

 const matches =
 [...String(text || '')
 .matchAll(/\{\{(\d+)\}\}/g)];


 if(!matches.length) return 0;


 return Math.max(
   ...matches.map(
    m=>parseInt(m[1],10)
   )
 );

};




const mapTemplate = (template)=>{

 const bodyText=getTemplateBody(template);


 return {

  id:
   template.id ||
   template.name,


  name:
   template.elementName ||
   template.name ||
   template.templateName,


  status:
   String(
    template.status || "UNKNOWN"
   ).toUpperCase(),


  language:
   template.language ||
   "en_US",


  category:
   template.category ||
   "MARKETING",


  bodyText,


  paramCount:
   countVariables(bodyText),


  raw:template

 };

};



// ===============================
// URL BUILDER
// ===============================


const buildUrl = (path,query={})=>{


 const {baseUrl}=getWatiConfig();


 if(!baseUrl){

  throw new Error(
   "WATI_API_ENDPOINT is not configured"
  );

 }


 // FIXED WATI API VERSION

 const url = new URL(

  `${baseUrl}/api/v1/${path.replace(/^\/+/,'')}`

 );



 Object.entries(query)
 .forEach(([key,value])=>{


  if(
   value!==undefined &&
   value!==null &&
   value!==""
  ){

   url.searchParams.set(
    key,
    value
   );

  }


 });


 return url.toString();


};




// ===============================
// MAIN REQUEST
// ===============================


const request = async(
 path,
 options={},
 label="WATI"
)=>{


 const {accessToken}=getWatiConfig();


 if(!accessToken){

  throw new Error(
   "WATI_ACCESS_TOKEN is not configured"
  );

 }



 for(
  let attempt=0;
  attempt<=MAX_RETRIES;
  attempt++
 ){


 const controller =
  new AbortController();


 const timeout =
  setTimeout(
   ()=>controller.abort(),
   30000
  );



 try{


 const response =
 await fetch(

  buildUrl(
   path,
   options.query
  ),

 {

 method:
 options.method || "GET",


 signal:
 controller.signal,


 headers:{

  Authorization:
  `Bearer ${accessToken}`,


  "Content-Type":
  "application/json",


  ...(options.headers || {})

 },


 body:
 options.body
 ? JSON.stringify(options.body)
 : undefined


 }

);



clearTimeout(timeout);



if(
 !response.ok &&
 RETRYABLE_STATUSES.has(response.status)&&
 attempt<MAX_RETRIES
){

 await sleep(
  RETRY_DELAY_MS[attempt]
 );

 continue;

}



const text =
 await response.text();


const data =
 text ? JSON.parse(text) : {};



if(!response.ok){

 throw new Error(
  `WATI API Error: HTTP ${response.status}`
 );

}



return data;



}catch(error){


clearTimeout(timeout);


if(error.name==="AbortError"){

 throw new Error(
  `${label} timeout`
 );

}


if(attempt<MAX_RETRIES){

 await sleep(
  RETRY_DELAY_MS[attempt]
 );

 continue;

}


throw error;


}


}



};




// ===============================
// EXTRACT RESULT
// ===============================


const extractItems=(data)=>{

 if(Array.isArray(data))
  return data;


 return (
  data.messageTemplates ||
  data.templates ||
  data.items ||
  data.result ||
  data.data ||
  []
 );

};




// ===============================
// GET WATI TEMPLATES
// ===============================


const getApprovedTemplates=async(
 {includeAll=false}={}
)=>{


 const data = await request(

  "getMessageTemplates",

  {
   method:"GET"
  },

  "WATI.getTemplates"

 );


 const templates =
 extractItems(data)
 .map(mapTemplate);



 const filtered =
 includeAll
 ?
 templates
 :
 templates.filter(
  t=>t.status==="APPROVED"
 );



 return {

  templates:filtered,

  total:filtered.length

 };


};




// ===============================
// SYNC CONTACT
// ===============================


const syncContact=async(contact)=>{


const phone =
 normalizePhone(contact.phone);



const data = await request(

 `addContact/${phone}`,

 {

 method:"POST",


 body:{

  name:contact.name,


  customParams:[

   {
    name:"email",
    value:contact.email || ""
   },


   {
    name:"source",
    value:contact.source || "CRM"
   }

  ]

 }

 },

 "WATI.syncContact"

);



return {

 success:true,

 raw:data

};


};




// ===============================
// SEND TEMPLATE
// ===============================


const sendTemplateMessage=async(

 phone,
 templateName,
 components={},
 languageCode="en_US",
 options={}

)=>{


const params =
Array.isArray(components)
? components
: components.body || [];



const data =
await request(

 "sendTemplateMessage",

 {

 method:"POST",


 query:{

  whatsappNumber:
  normalizePhone(phone)

 },


 body:{

  template_name:
  templateName,


  broadcast_name:
  options.broadcastName ||
  `CRM-${Date.now()}`,


  parameters:

  params.map(
   (value,index)=>({

    name:String(index+1),

    value:String(value)

   })
  )


 }


 },

 "WATI.sendTemplate"

);



const messageId =
 data.messageId ||
 crypto.randomUUID();



return {

 success:true,

 provider:"wati",

 watiMessageId:messageId,

 metaMessageId:messageId,

 status:"accepted",

 sentAt:new Date(),

 raw:data

};


};




// ===============================
// NORMAL MESSAGE
// ===============================


const sendMessage=async(
 phone,
 text
)=>{


const data =
await request(

 `sendSessionMessage/${normalizePhone(phone)}`,

 {

 method:"POST",


 body:{

  messageText:text

 }


 },

 "WATI.sendMessage"

);



return {

 success:true,

 provider:"wati",

 status:"sent",

 raw:data

};


};





// ===============================
// WEBHOOK SIGNATURE
// ===============================


const verifyWebhookSignature=(

 rawBody,
 signature,
 secret

)=>{


if(!secret) return true;

if(!signature) return false;



const expected = crypto

.createHmac(
 "sha256",
 secret
)

.update(
 rawBody || ""
)

.digest("hex");



try{

 return crypto.timingSafeEqual(

  Buffer.from(
   signature.replace(/^sha256=/,"")
  ),


  Buffer.from(expected)

 );


}catch{


 return false;


}


};




// ===============================
// VARIABLE REPLACE
// ===============================


const replaceVariables=(

 templateText,
 contact,
 fields=[]

)=>{


return String(templateText||"")

.replace(

 /\{\{(\d+)\}\}/g,


 (_,index)=>{


 const field =
 fields[
 parseInt(index,10)-1
 ];


 if(field){

  return (
   contact[field] ||
   contact.customFields?.[field] ||
   ""
  );

 }


 const fallback =
 ["name","phone","email"]
 [parseInt(index,10)-1];


 return contact[fallback] || "";


 }

);


};





module.exports={

 getApprovedTemplates,

 syncContact,

 sendTemplateMessage,

 sendMessage,

 verifyWebhookSignature,

 replaceVariables,

 normalizePhone

};