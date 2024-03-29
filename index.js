/**
 * Batch size for processing arrays in chunks.
 * @constant {number}
 */
const batchSize = 2;


/**
 * Performs a GET request to a specified URL.
 * This function is tailored for Procare's API, including authorization and custom headers.
 * 
 * @async
 * @param {string} url - The URL to send the GET request to.
 * @returns {Promise<Object>} The response data in JSON format.
 */
const curl = async (url) => {

    // Retrieve user auth token from local storage
    var auth_token = JSON.parse(JSON.parse(localStorage["persist:kinderlime"]).currentUser).data.auth_token;
    
    // Modify the current host for API request
    let apiHost = location.host.replace('schools','api-school');
    
    // Execute fetch request with custom headers including authorization
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

    // Parse and return JSON response
    let data = await response.json();
    return data;
}


/**
 * Retrieves a list of children associated with the user.
 * @async
 * @returns {Promise<Array>} An array of children from the API.
 */
  const listChildren = async () => {
    
    // get the actual subdomain we need to use here
    let apiHost = location.host.replace('schools','api-school');
    
    // set up the actual URL to hit
    let url = `https://${apiHost}/api/web/parent/kids/`
    
    // get information from it
    let responseData = await curl(url);
    
    return responseData;
    
  }

/**
 * Recursively fetches child data for all pages.
 * @async
 * @param {string} childId - The child's ID.
 * @param {number} [page=1] - Page number for paginated data.
 * @param {string} [date_from="2000-01-01"] - Start date for the data.
 * @param {string} [date_to="2031-07-30"] - End date for the data.
 * @param {Array} [data=[]] - Array to accumulate results.
 * @returns {Promise<Array>} The complete dataset for the child.
 */
const extractChildData = async (childId, page, date_from, date_to, data) => {
    
    // Initialize page number if not provided
    if (!page) {
        page = 1;
    }
    
    // Set a default future end date if not provided
    if (!date_to) {
        date_to = "2031-07-30";
    }
    
    // Set a default past start date if not provided
    if (!date_from) {
        date_from = "2000-01-01";
    }
    
    // Modify the current host to form the API endpoint
    let apiHost = location.host.replace('schools', 'api-school');
    
    // Construct the URL for the API request
    let url = `https://${apiHost}/api/web/parent/daily_activities/?kid_id=${childId}&filters%5Bdaily_activity%5D%5Bdate_to%5D=${date_to}&filters%5Bdaily_activity%5D%5Bdate_from%5D=${date_from}&page=${page}`;
    
    // Make an API call using the constructed URL
    let info = await curl(url);

    // Check if there are activities returned for the current page
    if (info.daily_activities.length !== 0) {
        
        // Add the fetched activities to the accumulated data
        info = data.concat(info.daily_activities);
        document.querySelector("#marquee").innerText = `Collecting Info From Page ${page}`;
        console.log(info);
        page++;
        
        // Recursively call function for the next page
        return extractChildData(childId, page, date_from, date_to, info);
    } else {
        // Resolve the promise with the accumulated data when no more activities are found
        return new Promise((resolve, reject) => { resolve(data); });
    }
};

/**
 * Extracts file extension from a URL.
 * @param {string} url - URL to extract the file extension from.
 * @returns {string} The file extension.
 */
const getFileExtension = (url) => new URL(url).pathname.split('.').pop();

/**
 * Fetches a file from a URL and downloads it, naming it according to provided metadata.
 * @async
 * @param {string} url - The URL of the file to download.
 * @param {Object} metadata - Metadata object containing 'created_at' and 'id' properties.
 * @returns {Promise<boolean>} True if download is successful, false otherwise.
 */
const fetchAndDownload = async (url, metadata) => {
  
    // Extract date from metadata and format it
    let date_of = metadata.created_at.replace(/\..*$/, "");

    // Extract ID from metadata
    let id = metadata.id;
    
    // Get the file extension from the URL
    let extension = getFileExtension(url);
    
    // Default to 'mpeg' if the extension is too long
    if (extension.length > 5) {
        extension = "mpeg";
    }
    
    // Construct the filename using date, id, and file extension
    let filename = `${date_of}_${id}.${extension}`;
  
    try {
        // Fetch the file from the URL
        const response = await fetch(url);
        // Throw an error if the fetch operation fails
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);

        // Create a blob from the response data
        const blob = await response.blob();
        
        // Create a download link for the blob
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", filename);

        // Trigger the file download
        link.click();

        // Clean up by removing the link and revoking the created URL
        link.remove();
        URL.revokeObjectURL(link.href);

        // Return true indicating the download was successful
        return true;
    } catch (error) {
        // Log and return false in case of an error
        console.error(`Error in fetchAndDownload:`, error);
        return false;
    }
}



/**
 * Splits an array into chunks of a specified size.
 * @param {Array} array - The array to split.
 * @param {number} chunkSize - The size of each chunk.
 * @returns {Array<Array>} An array of chunks.
 */
const chunkArray = (array, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
};

/**
 * Executes a list of tasks in batches, ensuring that a certain number of tasks are always running in parallel.
 * 
 * @param {Array<Function>} tasks - An array of tasks to be executed. Each task is expected to be a function returning a Promise.
 * @param {number} batchSize - The maximum number of tasks to run in parallel.
 * @returns {Promise<Array>} A promise that resolves with an array of results from the executed tasks.
 */
const executeInBatches = async (tasks, batchSize) => {
    let active = []; // Array to keep track of active promises
    let results = []; // Array to store results of all tasks

    for (const task of tasks) {
      // Determine the URL to fetch based on whether the item is a video or not
      const taskURL = task.is_video ? task.video_file_url : task.main_url;
      
      // Create a promise for each task
      const promise = fetchAndDownload(taskURL, task).then(result => {
          // Once a promise is resolved, remove it from the active array
          active = active.filter(p => p !== promise);
          return result;
      });

      // Add the newly created promise to the active and results arrays
      active.push(promise);
      results.push(promise);

      // If the number of active promises reaches the batch size, wait for one to complete before continuing
      if (active.length >= batchSize) {
          await Promise.race(active);
      }
    }

    // Wait for all promises to complete and return their results
    return Promise.all(results);
};

/**
 * Main function to orchestrate the fetching, processing, and downloading of children's data.
 * Interacts with the UI to provide feedback on the process.
 * @async
 * @returns {Promise<void>} A promise that resolves when the entire process is completed.
 */
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

    // Flatten the array to merge all children's data into a single array
    data = data.flat();

    // Create and download a blob containing the compiled data
    const blob = new Blob([JSON.stringify(data, null, "\t")], {
        type: "text/json;charset=utf8;"
    });
    
    const link = document.createElement("a");
    const dateString = new Date().toISOString();
    link.href = window.URL.createObjectURL(blob);
    link.download = `${dateString}_primrose.json`;
    link.click();

    // Step 3: Filter events to include only photos and videos
    const multiMedia = data
        .filter(x => x.activity_type === "photo_activity" || x.activity_type === "video_activity")
        .map(x => x.activiable);
        
    document.querySelector("#marquee").innerText = `Downloading ${multiMedia.length} files...`;

    // Step 4: Download multimedia content in batches
    await executeInBatches(multiMedia, batchSize);
    
    
    
    alert("DONE!");
};


document.querySelector("body").innerHTML = `

    <style>
        p{padding: 2.5px;}
        a{color: blue;}
        .section{
          margin-left: 0px;
        }
        
        .carer-dashboard__section {
            width: 100%;
            padding-right: 16px;
            background: #f4f4f4;
        }
    
    </style>
    
    
    <div id="root-app">
        <div class="app">
            <div class="app__inner">
            
                <!-- HEADER -->
                <header class="topbar"></header>

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
                                    <p>e-mail: <a href="mailto: justin@wolcott.io">justin@wolcott.io</a></p>
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
                                                          <input value="2022-01-01" type="date" id="start_date" style="border: none; height: 40px; font-size: large; border-radius: 10px; text-align: center;">
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
                                            
                                            <a onclick="main();" class="button carer-dashboard__button--pay" style="width:20%; margin-left: 10px; display: table;" id="start-the-reactor-quaide">
                                              <span style="display: table-cell; vertical-align: middle; font-size: 25px;">EXTRACT</span>
                                            </a>
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
    
    
