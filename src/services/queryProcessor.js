/**
 * Handles pagination and sorting for API results.
 */

function processQuery(items, queryParams, baseUrl) {
    let result = [...items];

    // 1. Sorting behavior
    // Default Graph behavior is often ascending by default if not specified
    // Sorting must use real createdDateTime and handle nulls (place at end)
    const orderby = queryParams.$orderby;
    
    const sortAsc = (a, b) => {
        if (!a.createdDateTime) return 1;
        if (!b.createdDateTime) return -1;
        return new Date(a.createdDateTime) - new Date(b.createdDateTime);
    };

    const sortDesc = (a, b) => {
        if (!a.createdDateTime) return 1;
        if (!b.createdDateTime) return -1;
        return new Date(b.createdDateTime) - new Date(a.createdDateTime);
    };

    if (orderby === 'createdDateTime desc') {
        result.sort(sortDesc);
    } else {
        // Default to ascending (or explicit createdDateTime/createdDateTime asc)
        result.sort(sortAsc);
    }

    // 2. $skip
    const skip = parseInt(queryParams.$skip) || 0;
    if (skip > 0) {
        result = result.slice(skip);
    }

    // 3. $top
    const top = parseInt(queryParams.$top) || null;
    let nextLink = null;
    if (top !== null && result.length > top) {
        const nextSkip = skip + top;
        
        // Build fully qualified absolute URL for nextLink
        if (baseUrl) {
            const url = new URL(baseUrl);
            // Preserve original query params but update $skip
            Object.keys(queryParams).forEach(key => {
                if (key !== '$skip') {
                    url.searchParams.set(key, queryParams[key]);
                }
            });
            url.searchParams.set('$skip', nextSkip.toString());
            nextLink = url.toString();
        } else {
            nextLink = `?$top=${top}&$skip=${nextSkip}`;
        }
        
        result = result.slice(0, top);
    }

    return {
        items: result,
        nextLink: nextLink
    };
}

module.exports = {
    processQuery
};
