// ///////////////////////////////////
//
//  name:    curl
//  purpose: all of procare's API calls appear to be "GET".
//           this function builds and executes a "GET" xhr request
//           with necessary credentials and returns a promise
//
// ///////////////////////////////////
const curl = async (url) => {

    //
    // STEP 1.) GET USER AUTH TOKEN
    //
    var auth_token = JSON.parse(JSON.parse(localStorage["persist:kinderlime"]).currentUser).data.auth_token;
    
    let apiHost = location.host.replace('schools','api-school');
    
    let response = await  fetch(url, {
        "headers": {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Authorization": "Bearer " + auth_token,
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "DNT": 1,
            "Host": apiHost,
            "Origin": location.origin,
            "Pragma": "no-cache",
            "Referer": location.origin,
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site",
            "Sec-GPC": "1",
            "TE": "trailers",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0"
        }
    })

    let data = await response.json();

    return data;
}


// ///////////////////////////////////
//
//  name:    listChildren
//    purpose: API Call to get a list of all the user's children
//             and return an array with a promise...
//
// ///////////////////////////////////
  const listChildren = async () => {
    
    // get the actual subdomain we need to use here
    let apiHost = location.host.replace('schools','api-school');
    
    // set up the actual URL to hit
    let url = `https://${apiHost}/api/web/parent/kids/`
    
    // get information from it
    let responseData = await curl(url);
    
    return responseData;
    
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
const extractChildData = async (childId, page, date_from, date_to, data) => {
    
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
    
    // get the actual subdomain we need to use here
    let apiHost = location.host.replace('schools','api-school');
    
    let url = `https://${apiHost}/api/web/parent/daily_activities/?kid_id=${childId}&filters%5Bdaily_activity%5D%5Bdate_to%5D=${date_to}&filters%5Bdaily_activity%5D%5Bdate_from%5D=${date_from}&page=${page}`;
    
    let info = await curl(url);

    if(info.daily_activities.length !== 0){
        
        info = data.concat(info.daily_activities);
        console.log(info);
        page++;
        
        return extractChildData(childId, page, date_from, date_to, info);
    } else {
        return new Promise((res, rej) => {res(data)})
    }
        
    
}


const fetchAndDownload = async (url) => {
  
    let filename = "";
  
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        const blob = await response.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", filename);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
        return true;
    } catch (error) {
        console.error(`Error in fetchAndDownload:`, error);
        return false;
    }
}



// Function to split array into chunks
const chunkArray = (array, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
};

// ///////////////////////////////////
//
//  name:      main
//    purpose:   function to run through all sub-processes
//               and link UI to code
//
//
// ///////////////////////////////////

// Main function to handle UI interactions and process flow
const main = async () => {
    const startDate = document.querySelector("#start_date").value;
    const endDate = document.querySelector("#end_date").value;

    // Step 1: Retrieve list of children
    const children = await listChildren();

    // Step 2: Collect and compile data for each child
    document.querySelector("#marquee").innerText = "Collecting Data";

    let data = await Promise.all(
        children.kids.map(x => extractChildData(x.id, 1, startDate, endDate, []))
    );

    data = data.flat();

    const blob = new Blob([JSON.stringify(data, null, "\t")], {
        type: "text/json;charset=utf8;"
    });
    
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "primrose.json";
    link.click();

    // Step 3: Filter events to include only photos and videos
    const multiMedia = data
        .filter(x => x.activity_type === "photo_activity" || x.activity_type === "video_activity")
        .map(x => x.activiable);
        
    const multiMediaBatches = chunkArray(multiMedia,3);

    // Step 4: Download multimedia content
    for (const [i, mm] of multiMedia.entries()) {
        console.log({ mm });
        if (!mm.is_video) {
            await fetchAndDownload(mm.main_url);
        } else {
            await fetchAndDownload(mm.video_file_url);
        }
        
        document.querySelector("#marquee").innerText = `Downloading ${i + 1} of ${multiMedia.length}`;
    }
};







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
                                    
                                    <p>source code: <a href="https://github.com/JWally/procare-media-downloader">GitHub</a></p>
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
                                                        <div class="tooltip-trigger">
                                                          <input value="2000-01-01" type="date" id="start_date" style="border: none; height: 40px; font-size: large; border-radius: 10px; text-align: center;">
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <span class="form__row-gap">up to</span>
                                            <!-- END DATE -->
                                            <div class="form-date">
                                                <div class="datepicker__wrapper">
                                                    <div class="tooltip tooltip--left tooltip--no-arrow tooltip--white datepicker">
                                                        <div class="tooltip-trigger">
                                                          <input value="2099-12-31" type="date" id="end_date" style="border: none; height: 40px; border-radius: 10px; font-size: large; text-align: center">
                                                        </div>
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
    
    
