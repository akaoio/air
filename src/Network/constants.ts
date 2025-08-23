/**
 * Network service constants
 */

export const ipv4Services = [
    'https://api.ipify.org?format=json',
    'https://ipv4.icanhazip.com',
    'https://v4.ident.me',
    'https://ipecho.net/plain',
    'https://checkip.amazonaws.com'
]

export const ipv6Services = [
    'https://api6.ipify.org?format=json',
    'https://ipv6.icanhazip.com',
    'https://v6.ident.me',
    'https://ipv6.ipecho.net/plain'
]

export const dnsServers = {
    ipv4: [
        { server: 'resolver1.opendns.com', query: 'myip.opendns.com' },
        { server: '1.1.1.1', query: 'whoami.cloudflare' },
        { server: '8.8.8.8', query: 'o-o.myaddr.l.google.com' }
    ],
    ipv6: [
        { server: '2620:119:35::35', query: 'myip.opendns.com' },
        { server: '2606:4700:4700::1111', query: 'whoami.cloudflare' }
    ]
}