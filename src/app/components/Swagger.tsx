'use client';
import 'swagger-ui-react/swagger-ui.css';
import dynamic from "next/dynamic";

type Props = {
  spec: Record<string, any>,
};

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

function Swagger({ spec }: Props) {
  return (
    <SwaggerUI
      spec={spec}
      docExpansion="list"
      defaultModelsExpandDepth={2}
      defaultModelRendering="example"
      tryItOutEnabled={false}
      requestSnippetsEnabled={true}
      requestSnippets={{
        generators: {
          curl_bash: {
            title: 'cURL',
            syntax: 'bash',
          },
        },
        defaultExpanded: true,
      }}
      persistAuthorization={true}
      requestInterceptor={(req) => {
        req.credentials = 'omit';
        return req;
      }}
    />
  );
}

export default Swagger;
