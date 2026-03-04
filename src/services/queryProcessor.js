/**
 * Handles pagination and sorting for API results.
 */

function processQuery(items, queryParams) {
    let result = [...items];

    // 1. $orderby (only createdDateTime supported)
    const orderby = queryParams.$orderby;
    if (orderby === 'createdDateTime' || orderby === 'createdDateTime desc') {
        result.sort((a, b) => new Date(b.createdDateTime) - new Date(a.createdDateTime));
    } else if (orderby === 'createdDateTime asc') {
        result.sort((a, b) => new Date(a.createdDateTime) - new Date(b.createdDateTime));
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
        // Prepare nextLink logic (simplified for mock)
        const nextSkip = skip + top;
        // In a real scenario, this would include the full URL
        // For now, we'll just indicate there's more
        nextLink = `?$top=${top}&$skip=${nextSkip}`;
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
