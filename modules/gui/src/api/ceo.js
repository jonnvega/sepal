import {get$, postJson$} from '~/http-client'

export default {

    login$: ({email, password}) => 
        postJson$('https://app.collect.earth/login', {
            body: {email, password},
            maxRetries: 0
        }).pipe(
            map(response => {
                if (response.response && response.response.session) {
                    const setCookieHeader = response.xhr.getResponseHeader('set-cookie');

                    if (setCookieHeader) {
                        const cookieParts = setCookieHeader.split(';');
                        const ringSessionCookie = cookieParts.find(part => part.startsWith('ring-session='));

                        if (ringSessionCookie) {
                            const token = ringSessionCookie.split('=')[1];
                            document.cookie = setCookieHeader;
                            return token;
                        } else {
                            console.warn("No 'ring-session' cookie found in the 'set-cookie' header");
                            throw new Error("No 'ring-session' cookie found");
                        }
                    } else {
                        console.warn("No 'set-cookie' header found in the login response");
                        throw new Error("No 'set-cookie' header found");
                    }
                } else {
                    console.error("Login failed");
                    throw new Error("Login failed");
                }
            }),
            catchError(error => {
                console.error('Login error:', error);
                throw error; // Re-throw the error to propagate it to subscribers
            })),

        getProjects$: (institutionId, token) => {
    
            if (token) {
                return get$(`https://app.collect.earth/get-institution-projects?institutionId=${institutionId}`, {
                    headers: { 
                        'Cookie': `ring-session=${token}` // Include the 'ring-session' cookie with the token value
                    },
                    maxRetries: 0
                })
                .pipe(
                    map(response => respons.response), // Extract the response data
                    catchError(error => {
                        console.error('Error fetching CEO projects:', error);
                        throw error;
                    })
                );
            } else {
                // Handle the case where the token is not found (user not logged in)
                console.error("No token found. User might not be logged in.");
                return Promise.reject(new Error("No token found")); 
            }
        },

        getProjectData$: (projectId, token) => {
            if (token) {
                return get$(`https://app.collect.earth/dump-project-raw-data?projectId=${projectId}`, {
                    headers: { 
                        'Cookie': `ring-session=${token}` // Include the 'ring-session' cookie with the token value
                    },
                    maxRetries: 0
                })
                .pipe(
                    map(response => response.response),
                    map(csvData => {
                        
                    }), // Extract the response data
                    catchError(error => {
                        console.error('Error fetching CEO project data:', error);
                        throw error;
                    })
                );
            } else {
                // Handle the case where the token is not found (user not logged in)
                console.error("No token found. User might not be logged in.");
                return Promise.reject(new Error("No token found")); 
            }
        },

        getUserInstitutions$: (token) => {
            if (token) {
                return get$(`https://app.collect.earth/get-all-institutions`, {
                    headers: { 
                        'Cookie': `ring-session=${token}` // Include the 'ring-session' cookie with the token value
                    },
                    maxRetries: 0
                })
                .pipe(
                    map(response => response.response), // Extract the response data
                    map(institutions => institutions.filter(institution => institution.isMember)),
                    catchError(error => {
                        console.error('Error fetching institutions:', error);
                        throw error;
                    })
                );
            } else {
                // Handle the case where the token is not found (user not logged in)
                console.error("No token found. User might not be logged in.");
                return Promise.reject(new Error("No token found")); 
            }
        },
}
