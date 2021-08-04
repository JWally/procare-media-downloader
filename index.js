// ///////////////////////////////////
//
//  name:    curl
//  purpose: all of procare's API calls appear to be "GET".
//           this function builds and executes a "GET" xhr request
//           with necessary credentials and returns a promise
//
// ///////////////////////////////////
function curl(url){

    //
    // STEP 1.) GET USER AUTH TOKEN
    //
    var auth_token = JSON.parse(JSON.parse(localStorage["persist:kinderlime"]).currentUser).data.auth_token;
    
    
    return fetch(url, {
        "headers": {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Authorization": "Bearer " + auth_token,
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "DNT": 1,
            "Host": "api-school.kinderlime.com",
            "Origin": "https://schools.procareconnect.com",
            "Pragma": "no-cache",
            "Referer": "https://schools.procareconnect.com/",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site",
            "Sec-GPC": "1",
            "TE": "trailers",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0"
        }
    })
    .then((resp) => {
        var json = resp.json();
        return json;
    });

}


// ///////////////////////////////////
//
//  name:    listChildren
//    purpose: API Call to get a list of all the user's children
//             and return an array with a promise...
//
// ///////////////////////////////////
function listChildren(){
    
    return curl("https://api-school.kinderlime.com/api/web/parent/kids/")
        .then((data) => {
            return data.kids.map((x) => {return x.id});
        });
    
}


// ///////////////////////////////////
//
//  name:      extractChildData
//    purpose:   API Call to walk through all pages of a child's data
//               terminating when nothing else returns
//
//  arguments:
//                - childId:   Child ID given from listChildren API Function
//                - page:      what page of results to return given criteria
//                - from_date: start date of data-set. Defaults to 1/1/2000
//                - to_date:   end date of data-set. Defaults to way in the future
//                - data:      an array to stuff daily_activities into (SO MANY ACTIVITIES!!)
//
//
// ///////////////////////////////////
function extractChildData(childId, page, date_from, date_to, data){
    
    //
    // Allow us to traverse by page
    // unless something else comes along
    //
    if(!page){
        page = 1;
    }
    
    //
    // Unless a specific end date is given, set one 10 years in the futuer
    //
    if(!date_to){
        date_to = "2031-07-30";
    }
    
    //
    // Unless a specifid start date is asked, set one 21 years in the past
    //
    if(!date_from){
        date_from = "2000-01-01";
    }
    
    var url = "https://api-school.kinderlime.com/api/web/parent/daily_activities/?kid_id=" + childId
        + "&filters%5Bdaily_activity%5D%5Bdate_to%5D=" + date_to
        + "&filters%5Bdaily_activity%5D%5Bdate_from%5D=" + date_from
        + "&page=" + page;
    
    return curl(url)
        .then((x) => {
            
            console.log(x, data);
            if(x.daily_activities.length !== 0){
                
                data = data.concat(x.daily_activities);
                page++;
                
                return extractChildData(childId, page, date_from, date_to, data);
            } else {
                return new Promise((res, rej) => {res(data)})
            }
        });
    
}


//
//
// Cheat function to download whatever
// by creating an 'a' tag, and clicking it
//
// K
// I
// S
// S
//
//
async function get_media(url){


    var link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "WHOA");
    link.click();

    return new Promise((res, rej) => {res(true)})

}



// ///////////////////////////////////
//
//  name:      main
//    purpose:   function to run through all sub-processes
//               and link UI to code
//
//
// ///////////////////////////////////
async function main(){
        
        
    start_date = document.querySelector("#start_date").value;
    
    end_date = document.querySelector("#end_date").value;
        
    //
    // STEP 1.) GET ALL OF THE CHILDRENS
    //
        var children = await listChildren();
        
        
    //
    // STEP 2.) EXTRACT ALL ACTIVITIES FOR ALL THE CHILDRENS
    //
    
        document.querySelector("#marquee").innerText = (`Collecting Data`);

    
        var data = await Promise.all(children.map((x) => {
            return extractChildData(x,1,start_date, end_date,[]);
        }));
        
        data = data.reduce((a,b) => {return a.concat(b)});
        
        
        var blob = new Blob([JSON.stringify(data,null,"\t")], {"type": "text/json;charset=utf8;"});
        var link;
            
        link = document.createElement("a");
        link.setAttribute("href", window.URL.createObjectURL(blob));
        link.setAttribute("download", "primrose.json");
        link.click();
        
        

    //
    // STEP 3.) Filter down our events to just photos and videos
    //
        var multiMedia = data.filter((x) => {
            return x.activity_type == "photo_activity" || x.activity_type == "video_activity"
        })
        //
        // This is the part of the object with multiMedia URLs we care about
        .map((x) => {
            return x.activiable;
        });
        
            
    //
    // STEP 4.) DOWNLOAD ALL OF OUR MULTI-MEDIA, PAUSING 2.0 SECONDS (!!! OK !!!)
    //            BETWEEN
    //
    
        console.log(multiMedia);
        var i = 0;

        for(const mm of multiMedia){
            i++;
            if(!mm.is_video){
                get_media(mm.main_url);
            } else {
                get_media(mm.video_file_url);
            }
            await new Promise((resolve) => setTimeout(resolve,2000));
            
            document.querySelector("#marquee").innerText = (`downloading ${i.toLocaleString()} of ${multiMedia.length.toLocaleString()}`)
        }


}










document.querySelector("body").innerHTML = `

    <style>
        p{padding: 2.5px;}
        a{color: blue;}
    
    </style>
    
    
    <div id="root-app">
        <div class="app">
            <div class="app__inner">
            
                <!-- HEADER -->
                <header class="topbar"></header>
            
                <!-- SIDEBAR -->
                <aside class="sidebar sidebar--enterprise"></aside>
            
            
                <!-- MAIN SECTION -->
                <section class="section">
                    <div class="carer-dashboard">
                        <div class="carer-dashboard__section">
                            <div class="carer-dashboard__content">
                            
                                <!-- PREAMBLE -->
                                <div style="text-align: center;">
                                    <h1 style="padding-top:15px;font-size:75px;color:grey;" data-bind="text: 'procare'">procare excavator</h1>
                                    
                                    <h3 style="padding-top:15px;font-size:25px;color:grey;margin-top: 25px; margin-bottom: 25px;">Questions, Comments, Concerns? <br />Feel Free to Contact me::</h3>
                                    
                                    <p>source code: <a href="https://www.linkedin.com/in/justinwwolcott/">GitHub</a></p>
                                    <p>e-mail: <a href="mailto: procare.excavator@wolcott.io">procare.excavator@wolcott.io</a></p>
                                    <p>linkedin: <a href="https://www.linkedin.com/in/justinwwolcott/">https://www.linkedin.com/in/justinwwolcott/</a></p>
                                </div>
                                
                                <!-- FORM -->
                                <div style="text-align: center; margin-top: 30px; margin-bottom: 30px; height: reset;">
                                   <div style="justify-content: center;">
                                        <div class="form__row form--inline" style="justify-content: center;">
                                            <!-- START DATE -->
                                            <div class="form-date">
                                                <div class="datepicker__wrapper">
                                                    <div class="tooltip tooltip--left tooltip--no-arrow tooltip--white datepicker">
                                                        <div class="tooltip-trigger"><input value="2000-01-01" type="date" id="start_date" style="border: none; height: 100%; text-align: center;"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <span class="form__row-gap">up to</span>
                                            <!-- END DATE -->
                                            <div class="form-date">
                                                <div class="datepicker__wrapper">
                                                    <div class="tooltip tooltip--left tooltip--no-arrow tooltip--white datepicker">
                                                        <div class="tooltip-trigger"><input value="2099-12-31" type="date" id="end_date" style="border: none; height: 100%; text-align: center"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <a onclick="main();" class="button carer-dashboard__button--pay" style="width:20%; margin-left: 10px; height: 35px; " id="start-the-reactor-quaide">EXTRACT</a>
                                        </div>
                                   </div>
                                </div>
                                
                                
                                
                                
                                
                                <div style="text-align: center;">
                                    <h1 style="padding-top:15px;font-size:75px;color:red;" id="marquee">- - - </h1>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </app>
    </div>

    
    
    
    
    
    
`;
