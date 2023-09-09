"use client";
import React from "react";

type Props = {
  results: any;
  search: string | null;
};

const ResultPage = ({ results, search }: Props) => {
  return (
    <div className="flex flex-col w-full h-full p-2">
      {/*       <pre>
        {JSON.stringify(
          {
            results,
            search,
          },
          null,
          2
        )}
      </pre> */}
      <div className="flex flex-row gap-2">
        <h1>Search query: </h1>
        <pre>{JSON.stringify(search, null, 2)}</pre>
      </div>
      <div className="flex flex-row gap-2">
        <h1>Search results in CRM Opportunities: </h1>
        <p>{results?.data?.opportunities?.length}</p>
      </div>
      <div className="flex flex-row gap-2">
        <h1>Search results in CRM Acocunts: </h1>
        <p>{results?.data?.accounts?.length}</p>
      </div>
      <div className="flex flex-row gap-2">
        <h1>Search results in CRM contacts: </h1>
        <p>{results?.data?.contacts?.length}</p>
      </div>
      <div className="flex flex-row gap-2">
        <h1>Search results in Local users: </h1>
        <p>{results?.data?.users?.length}</p>
      </div>
      <div className="flex flex-row gap-2">
        <h1>Search results in Local Tasks: </h1>
        <p>{results?.data?.tasks?.length}</p>
      </div>
      <div className="flex flex-row gap-2">
        <h1>Search results in Local Projects: </h1>
        <p>{results?.data?.projects?.length}</p>
      </div>
      {/*   {results?.results?.opportunities?.length > 0 && (
        <div>
          <OppsResults data={results?.results?.opportunities} />
        </div>
      )}
      {results?.results?.accounts?.length > 0 && (
        <div>
          <AccountsResults data={results?.results?.accounts} />
        </div>
      )}
      {results?.results?.contacts?.length > 0 && (
        <div>
          <ContactsResults data={results?.results?.contacts} />
        </div>
      )}
      {results?.results?.users?.length > 0 && (
        <div>
          <UsersResults data={results?.results?.users} />
        </div>
      )} */}
      {/* <div>
          <h1>Search results: </h1>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div> */}
    </div>
  );
};

export default ResultPage;
