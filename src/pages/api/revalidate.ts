import {isValidSignature, SIGNATURE_HEADER_NAME} from "@sanity/webhook"
import type { NextApiRequest, NextApiResponse } from "next"

type Data = {
  message: string
}

// Next.js will by default parse the body, which can lead to invalid signatures
export const config = {
    api: {
      bodyParser: false,
    },
  }

const secret = process.env.SANITY_REVALIDATE_SECRET

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    const signature = req.headers[SIGNATURE_HEADER_NAME] as string
    const body = await readBody(req) // Read the body into a string

    if (req.method !== "POST") {
        console.error("Must be a POST request")
        return res.status(401).json({ message: "Must be a POST request" })
    }

    if (!isValidSignature(body, signature, secret)) {
        res.status(401).json({message: 'Invalid signature'})
        return
    }

  try {
    const { _type: type, slug } = JSON.parse(body)
    console.log(type)

    switch (type) {
      case "post":
        await res.revalidate(`/projects/${slug.current}`) // The particular project
        await res.revalidate(`/projects`)         // The Projects page
        await res.revalidate(`/`)                 // The landing page featured projects
        console.log(`/projects/${slug.current}`)
        return res.json({ message: `Revalidated "${type}" with slug "${slug.current}"` })
    }

    return res.json({ message: "No managed type" })
  } catch (err) {
    console.log('Error revalidating', body)
    return res.status(500).send({ message: "Error revalidating" })
  }
}

async function readBody(readable) {
    const chunks = []
    for await (const chunk of readable) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    return Buffer.concat(chunks).toString('utf8')
  }