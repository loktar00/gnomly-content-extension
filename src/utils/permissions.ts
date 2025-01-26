export const requestPagePermissions = async (url: string): Promise<boolean> => {
    try {
        // Extract origin from URL
        const origin = new URL(url).origin + "/*";

        // Request permission for the specific page
        const granted = await chrome.permissions.request({
            origins: [origin]
        });

        return granted;
    } catch (error) {
        console.error('Error requesting permissions:', error);
        return false;
    }
};

export const checkPagePermissions = async (url: string): Promise<boolean> => {
    try {
        const origin = new URL(url).origin + "/*";
        return await chrome.permissions.contains({
            origins: [origin]
        });
    } catch (error) {
        console.error('Error checking permissions:', error);
        return false;
    }
};