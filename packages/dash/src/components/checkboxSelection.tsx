export const checkboxSelection = function (params: any) {
  // we put checkbox on the name if we are not doing grouping
  //return params.columnApi.getRowGroupColumns().length === 0;
  return !!params.data && params.data.id !== -1;
};
export const headerCheckboxSelection = function (params: any) {
  // we put checkbox on the name if we are not doing grouping
  return params.columnApi.getRowGroupColumns().length === 0;
};
